import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LLM_BUDGETS, SubscriptionTier } from '@/lib/subscription';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const tier = session.metadata?.tier as SubscriptionTier;

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get full subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Check if subscription exists for this user
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  // Access period dates - Stripe v20+ uses different property access
  const periodStart = (stripeSubscription as unknown as { current_period_start: number }).current_period_start;
  const periodEnd = (stripeSubscription as unknown as { current_period_end: number }).current_period_end;

  const subscriptionData = {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: stripeSubscription.id,
    tier,
    status: 'active' as const,
    currentPeriodStart: new Date(periodStart * 1000),
    currentPeriodEnd: new Date(periodEnd * 1000),
    llmBudgetCents: LLM_BUDGETS[tier],
    llmSpentCents: 0,
  };

  if (existingSubscription) {
    await db.update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, existingSubscription.id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      ...subscriptionData,
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const tier = subscription.metadata?.tier as SubscriptionTier;

  if (!userId) {
    console.error('Missing userId in subscription metadata');
    return;
  }

  const status = mapStripeStatus(subscription.status);

  // Access period dates - Stripe v20+ uses different property access
  const sub = subscription as unknown as { current_period_start: number; current_period_end: number; status: string };

  await db.update(subscriptions)
    .set({
      tier: tier || undefined,
      status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      llmBudgetCents: tier ? LLM_BUDGETS[tier] : undefined,
      // Reset LLM spend at period renewal if status is active
      llmSpentCents: sub.status === 'active' ? 0 : undefined,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.update(subscriptions)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Access subscription from invoice - Stripe v20+ uses different property access
  const inv = invoice as unknown as { subscription?: string };
  if (inv.subscription) {
    await db.update(subscriptions)
      .set({ status: 'past_due' })
      .where(eq(subscriptions.stripeSubscriptionId, inv.subscription));
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'cancelled' | 'past_due' | 'trialing' {
  switch (status) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'trialing':
      return 'trialing';
    default:
      return 'cancelled';
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { upsertSubscription, cancelSubscription } from '@/lib/subscription';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Map Stripe price IDs to our tiers
const PRICE_TO_TIER: Record<string, 'starter' | 'pro' | 'enterprise'> = {
  [process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '']: 'starter',
  [process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || '']: 'starter',
  [process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '']: 'pro',
  [process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '']: 'pro',
  [process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || '']: 'enterprise',
  [process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL || '']: 'enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No userId in checkout session metadata');
          break;
        }

        // Get subscription details
        if (session.subscription && typeof session.subscription === 'string') {
          const subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription);
          // Access properties using type assertion for newer Stripe types
          const subscriptionData = subscriptionResponse as unknown as {
            items: { data: Array<{ price: { id: string } }> };
            status: string;
            current_period_start: number;
            current_period_end: number;
          };
          
          const priceId = subscriptionData.items.data[0]?.price.id || '';
          const tier = PRICE_TO_TIER[priceId] || session.metadata?.tier || 'starter';

          await upsertSubscription(
            userId,
            session.customer as string,
            session.subscription,
            tier as 'starter' | 'pro' | 'enterprise',
            subscriptionData.status,
            new Date(subscriptionData.current_period_start * 1000),
            new Date(subscriptionData.current_period_end * 1000)
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscriptionEvent = event.data.object;
        // Access properties using type assertion
        const subscription = subscriptionEvent as unknown as {
          id: string;
          customer: string;
          metadata?: { userId?: string };
          items: { data: Array<{ price: { id: string } }> };
          status: string;
          current_period_start: number;
          current_period_end: number;
        };
        
        const userId = subscription.metadata?.userId;

        if (!userId) {
          // Try to find user by stripeSubscriptionId
          const [existingSub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
            .limit(1);

          if (existingSub) {
            const priceId = subscription.items.data[0]?.price.id || '';
            const tier = PRICE_TO_TIER[priceId] || 'starter';

            await upsertSubscription(
              existingSub.userId,
              subscription.customer as string,
              subscription.id,
              tier as 'starter' | 'pro' | 'enterprise',
              subscription.status,
              new Date(subscription.current_period_start * 1000),
              new Date(subscription.current_period_end * 1000)
            );
          }
        } else {
          const priceId = subscription.items.data[0]?.price.id || '';
          const tier = PRICE_TO_TIER[priceId] || 'starter';

          await upsertSubscription(
            userId,
            subscription.customer as string,
            subscription.id,
            tier as 'starter' | 'pro' | 'enterprise',
            subscription.status,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscriptionEvent = event.data.object;
        const subscription = subscriptionEvent as unknown as { id: string };
        
        // Find and cancel subscription
        const [existingSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
          .limit(1);

        if (existingSub) {
          await cancelSubscription(existingSub.userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoiceEvent = event.data.object;
        const invoice = invoiceEvent as unknown as { subscription?: string };
        
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          const [existingSub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription))
            .limit(1);

          if (existingSub) {
            await db
              .update(subscriptions)
              .set({ status: 'past_due', updatedAt: new Date() })
              .where(eq(subscriptions.userId, existingSub.userId));
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

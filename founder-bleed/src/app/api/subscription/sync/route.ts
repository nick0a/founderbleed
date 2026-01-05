import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LLM_BUDGETS, SubscriptionTier } from '@/lib/subscription';

// Sync subscription from Stripe (useful when webhook isn't reaching localhost)
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if we have an existing subscription record with a Stripe customer ID
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
    });

    let customerId = existingSubscription?.stripeCustomerId;

    // If no customer ID, search Stripe by email
    if (!customerId && session.user.email) {
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      return NextResponse.json({
        synced: false,
        message: 'No Stripe customer found for this account'
      });
    }

    // Get active subscriptions for this customer
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (stripeSubscriptions.data.length === 0) {
      return NextResponse.json({
        synced: false,
        message: 'No active subscription found in Stripe'
      });
    }

    const stripeSub = stripeSubscriptions.data[0];

    // Get tier from metadata or default to 'starter'
    const tier = (stripeSub.metadata?.tier as SubscriptionTier) || 'starter';

    // Access period dates
    const sub = stripeSub as unknown as { current_period_start: number; current_period_end: number };

    const subscriptionData = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      tier,
      status: 'active' as const,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      llmBudgetCents: LLM_BUDGETS[tier],
      llmSpentCents: 0,
    };

    if (existingSubscription) {
      await db.update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.id, existingSubscription.id));
    } else {
      await db.insert(subscriptions).values({
        userId: session.user.id,
        ...subscriptionData,
      });
    }

    return NextResponse.json({
      synced: true,
      tier,
      message: 'Subscription synced successfully'
    });
  } catch (error) {
    console.error('Subscription sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

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

  console.log('[Subscription Sync] Starting sync for user:', session?.user?.id, 'email:', session?.user?.email);

  if (!session?.user?.id) {
    console.log('[Subscription Sync] No session found - unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if we have an existing subscription record with a Stripe customer ID
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, session.user.id),
    });
    console.log('[Subscription Sync] Existing subscription in DB:', existingSubscription?.id, 'status:', existingSubscription?.status);

    let customerId = existingSubscription?.stripeCustomerId;

    // If no customer ID, search Stripe by email
    if (!customerId && session.user.email) {
      console.log('[Subscription Sync] No customer ID, searching Stripe by email:', session.user.email);
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });
      console.log('[Subscription Sync] Found customers:', customers.data.length);

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[Subscription Sync] Found Stripe customer:', customerId);
      }
    }

    if (!customerId) {
      console.log('[Subscription Sync] No Stripe customer found');
      return NextResponse.json({
        synced: false,
        message: 'No Stripe customer found for this account'
      });
    }

    // Get active subscriptions for this customer
    console.log('[Subscription Sync] Fetching subscriptions for customer:', customerId);
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    console.log('[Subscription Sync] Found subscriptions:', stripeSubscriptions.data.length);

    if (stripeSubscriptions.data.length === 0) {
      console.log('[Subscription Sync] No active subscriptions found in Stripe');
      return NextResponse.json({
        synced: false,
        message: 'No active subscription found in Stripe'
      });
    }

    const stripeSub = stripeSubscriptions.data[0];
    console.log('[Subscription Sync] Stripe subscription:', stripeSub.id, 'status:', stripeSub.status, 'metadata:', stripeSub.metadata);

    // Get tier from metadata or default to 'starter'
    const tier = (stripeSub.metadata?.tier as SubscriptionTier) || 'starter';
    console.log('[Subscription Sync] Tier from metadata:', tier);

    // Access period dates - handle different Stripe API versions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = stripeSub as any;
    let periodStart: Date;
    let periodEnd: Date;

    // Try to get period dates from various possible locations
    if (typeof subAny.current_period_start === 'number') {
      periodStart = new Date(subAny.current_period_start * 1000);
      periodEnd = new Date(subAny.current_period_end * 1000);
    } else if (subAny.current_period_start instanceof Date) {
      periodStart = subAny.current_period_start;
      periodEnd = subAny.current_period_end;
    } else {
      // Fallback to current date + 30 days
      console.log('[Subscription Sync] Could not parse period dates, using fallback');
      periodStart = new Date();
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    console.log('[Subscription Sync] Period dates:', { periodStart, periodEnd });

    const subscriptionData = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      tier,
      status: 'active' as const,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      llmBudgetCents: LLM_BUDGETS[tier],
      llmSpentCents: 0,
    };

    if (existingSubscription) {
      console.log('[Subscription Sync] Updating existing subscription');
      await db.update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.id, existingSubscription.id));
    } else {
      console.log('[Subscription Sync] Creating new subscription record');
      await db.insert(subscriptions).values({
        userId: session.user.id,
        ...subscriptionData,
      });
    }

    console.log('[Subscription Sync] SUCCESS - synced tier:', tier);
    return NextResponse.json({
      synced: true,
      tier,
      message: 'Subscription synced successfully'
    });
  } catch (error) {
    console.error('[Subscription Sync] ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Subscription Sync] Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { error: 'Failed to sync subscription', details: errorMessage },
      { status: 500 }
    );
  }
}

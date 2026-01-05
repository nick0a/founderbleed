import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSubscription, LLM_BUDGETS, SubscriptionTier, Subscription } from '@/lib/subscription';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

// Try to sync subscription from Stripe if none exists locally
async function trySyncFromStripe(userId: string, email: string | null | undefined): Promise<Subscription | null> {
  if (!email) return null;

  try {
    // Search for customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) return null;

    const customerId = customers.data[0].id;

    // Get active subscriptions
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (stripeSubscriptions.data.length === 0) return null;

    const stripeSub = stripeSubscriptions.data[0];
    const tier = (stripeSub.metadata?.tier as SubscriptionTier) || 'starter';
    const sub = stripeSub as unknown as { current_period_start: number; current_period_end: number };

    // Create subscription record
    const [created] = await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSub.id,
      tier,
      status: 'active',
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      llmBudgetCents: LLM_BUDGETS[tier],
      llmSpentCents: 0,
    }).returning();

    // Cast to Subscription type
    return {
      id: created.id,
      userId: created.userId || userId,
      stripeCustomerId: created.stripeCustomerId,
      stripeSubscriptionId: created.stripeSubscriptionId,
      tier: created.tier as SubscriptionTier | null,
      status: created.status as 'active' | 'cancelled' | 'past_due' | 'trialing' | null,
      currentPeriodStart: created.currentPeriodStart,
      currentPeriodEnd: created.currentPeriodEnd,
      llmBudgetCents: created.llmBudgetCents,
      llmSpentCents: created.llmSpentCents,
    };
  } catch (error) {
    console.error('Auto-sync from Stripe failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let subscription = await getSubscription(session.user.id);

    // If no local subscription, try to sync from Stripe
    if (!subscription) {
      subscription = await trySyncFromStripe(session.user.id, session.user.email);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    const activeSubscription = subscription?.status === 'active' ? subscription : null;

    return NextResponse.json({
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        llmBudgetCents: subscription.llmBudgetCents,
        llmSpentCents: subscription.llmSpentCents,
      } : null,
      isSubscribed: !!activeSubscription,
      freeAuditUsed: user?.freeAuditUsed ?? false,
      canRunAudit: !user?.freeAuditUsed || !!activeSubscription,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}

import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: SubscriptionTier | null;
  status: SubscriptionStatus | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  llmBudgetCents: number | null;
  llmSpentCents: number | null;
}

// LLM budget by tier (in cents)
export const LLM_BUDGETS: Record<SubscriptionTier, number> = {
  starter: 300,    // $3.00/month
  pro: 750,        // $7.50/month
  enterprise: 1350 // $13.50/month
};

// Subscription prices
export const SUBSCRIPTION_PRICES = {
  starter: {
    monthly: 2000,  // $20/month
    annual: 20000,  // $200/year (2 months free)
  },
  pro: {
    monthly: 5000,  // $50/month
    annual: 50000,  // $500/year (2 months free)
  },
  enterprise: {
    monthly: 9000,  // $90/month
    annual: 90000,  // $900/year (2 months free)
  },
};

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active')
    ),
  });

  return subscription as Subscription | null;
}

// Sync subscription from Stripe by user email
export async function syncSubscriptionFromStripe(userId: string, email: string): Promise<Subscription | null> {
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

    // Debug: log the subscription structure
    console.log('Stripe subscription found:', {
      id: stripeSub.id,
      status: stripeSub.status,
      metadata: stripeSub.metadata,
      keys: Object.keys(stripeSub),
    });

    // Access period dates - handle different Stripe API versions
    let periodStart: Date;
    let periodEnd: Date;

    // Try to access current_period_start/end - may be nested or direct
    const subAny = stripeSub as unknown as Record<string, unknown>;
    if (typeof subAny.current_period_start === 'number') {
      periodStart = new Date(subAny.current_period_start * 1000);
      periodEnd = new Date((subAny.current_period_end as number) * 1000);
    } else if (stripeSub.items?.data?.[0]) {
      // Try getting from subscription items
      const item = stripeSub.items.data[0] as unknown as Record<string, unknown>;
      periodStart = new Date((item.current_period_start as number || Date.now() / 1000) * 1000);
      periodEnd = new Date((item.current_period_end as number || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
    } else {
      // Fallback to current date + 30 days
      periodStart = new Date();
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Check if subscription already exists
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

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

    if (existing) {
      await db.update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.id, existing.id));

      return {
        id: existing.id,
        userId,
        ...subscriptionData,
      };
    }

    // Create subscription record
    const [created] = await db.insert(subscriptions).values({
      userId,
      ...subscriptionData,
    }).returning();

    return {
      id: created.id,
      userId,
      stripeCustomerId: created.stripeCustomerId,
      stripeSubscriptionId: created.stripeSubscriptionId,
      tier: created.tier as SubscriptionTier | null,
      status: created.status as SubscriptionStatus | null,
      currentPeriodStart: created.currentPeriodStart,
      currentPeriodEnd: created.currentPeriodEnd,
      llmBudgetCents: created.llmBudgetCents,
      llmSpentCents: created.llmSpentCents,
    };
  } catch (error) {
    console.error('Sync subscription from Stripe failed:', error);
    return null;
  }
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  return subscription as Subscription | null;
}

export interface GateResult {
  allowed: boolean;
  reason?: 'subscription_required' | 'upgrade_required' | 'free_audit_used' | 'budget_exceeded';
}

export async function requireSubscription(
  userId: string,
  minTier?: SubscriptionTier
): Promise<GateResult> {
  const subscription = await getActiveSubscription(userId);

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'subscription_required' };
  }

  if (minTier && subscription.tier) {
    const tierOrder: Record<SubscriptionTier, number> = { starter: 1, pro: 2, enterprise: 3 };
    if (tierOrder[subscription.tier] < tierOrder[minTier]) {
      return { allowed: false, reason: 'upgrade_required' };
    }
  }

  return { allowed: true };
}

export async function requireAuditQuota(userId: string, userEmail?: string): Promise<GateResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { allowed: false, reason: 'subscription_required' };
  }

  let subscription = await getActiveSubscription(userId);

  // If no local subscription and user has used free audit, try syncing from Stripe
  if (!subscription && user.freeAuditUsed) {
    const email = userEmail || user.email;
    if (email) {
      subscription = await syncSubscriptionFromStripe(userId, email);
    }
  }

  // If user has used their free audit and has no active subscription
  if (user.freeAuditUsed && !subscription) {
    return { allowed: false, reason: 'free_audit_used' };
  }

  return { allowed: true };
}

export async function requireLLMBudget(userId: string, estimatedCostCents: number): Promise<GateResult> {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return { allowed: false, reason: 'subscription_required' };
  }

  const budget = subscription.llmBudgetCents ?? 0;
  const spent = subscription.llmSpentCents ?? 0;
  const remaining = budget - spent;

  if (remaining < estimatedCostCents) {
    return { allowed: false, reason: 'budget_exceeded' };
  }

  return { allowed: true };
}

export async function trackLLMUsage(userId: string, costCents: number): Promise<void> {
  const subscription = await getActiveSubscription(userId);

  if (subscription) {
    await db.update(subscriptions)
      .set({
        llmSpentCents: (subscription.llmSpentCents ?? 0) + costCents
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

export async function markFreeAuditUsed(userId: string): Promise<void> {
  await db.update(users)
    .set({ freeAuditUsed: true })
    .where(eq(users.id, userId));
}

export function isSubscribed(subscription: Subscription | null): boolean {
  return subscription !== null && subscription.status === 'active';
}

export function hasFeatureAccess(
  subscription: Subscription | null,
  feature: 'planning' | 'automated_audits' | 'comparison' | 'dashboard_full'
): boolean {
  if (!subscription || subscription.status !== 'active') {
    return false;
  }

  // All paid tiers have access to all features
  return true;
}

// Subscription management and feature gating

import { db } from '@/lib/db';
import { subscriptions, users, audits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Subscription tiers and their features
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    llmBudgetCents: 0,
    auditsAllowed: 1,
    features: {
      viewResults: true,
      shareReport: true,
      planningAssistant: false,
      automatedAudits: false,
      comparisonViews: false,
      fullDashboard: false,
    },
  },
  starter: {
    name: 'Starter',
    priceMonthly: 2000, // $20
    priceAnnual: 20000, // $200 (2 months free)
    llmBudgetCents: 300, // $3.00
    auditsAllowed: -1, // unlimited
    features: {
      viewResults: true,
      shareReport: true,
      planningAssistant: true,
      automatedAudits: true,
      comparisonViews: true,
      fullDashboard: true,
    },
  },
  pro: {
    name: 'Pro',
    priceMonthly: 5000, // $50
    priceAnnual: 50000, // $500 (2 months free)
    llmBudgetCents: 750, // $7.50
    auditsAllowed: -1,
    features: {
      viewResults: true,
      shareReport: true,
      planningAssistant: true,
      automatedAudits: true,
      comparisonViews: true,
      fullDashboard: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 9000, // $90
    priceAnnual: 90000, // $900 (2 months free)
    llmBudgetCents: 1350, // $13.50
    auditsAllowed: -1,
    features: {
      viewResults: true,
      shareReport: true,
      planningAssistant: true,
      automatedAudits: true,
      comparisonViews: true,
      fullDashboard: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'none';
  currentPeriodEnd: Date | null;
  llmBudgetCents: number;
  llmSpentCents: number;
}

/**
 * Get active subscription for a user
 */
export async function getActiveSubscription(userId: string): Promise<SubscriptionStatus | null> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    return null;
  }

  return {
    tier: (subscription.plan || 'free') as SubscriptionTier,
    status: (subscription.status || 'none') as SubscriptionStatus['status'],
    currentPeriodEnd: subscription.currentPeriodEnd,
    llmBudgetCents: subscription.llmBudgetCents || 0,
    llmSpentCents: subscription.llmSpentCents || 0,
  };
}

/**
 * Check if user has an active paid subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  return subscription !== null && 
    subscription.status === 'active' && 
    subscription.tier !== 'free';
}

/**
 * Require a minimum subscription tier
 */
export async function requireSubscription(
  userId: string, 
  minTier?: SubscriptionTier
): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getActiveSubscription(userId);

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'subscription_required' };
  }

  if (subscription.tier === 'free') {
    return { allowed: false, reason: 'subscription_required' };
  }

  if (minTier) {
    const tierOrder: Record<SubscriptionTier, number> = { 
      free: 0, 
      starter: 1, 
      pro: 2, 
      enterprise: 3 
    };
    if (tierOrder[subscription.tier] < tierOrder[minTier]) {
      return { allowed: false, reason: 'upgrade_required' };
    }
  }

  return { allowed: true };
}

/**
 * Check if user can create a new audit (free audit limit)
 */
export async function requireAuditQuota(
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if user has active subscription
  const hasSubscription = await hasActiveSubscription(userId);
  if (hasSubscription) {
    return { allowed: true };
  }

  // Check if free audit already used
  const [user] = await db
    .select({ freeAuditUsed: users.freeAuditUsed })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.freeAuditUsed) {
    return { allowed: false, reason: 'free_audit_used' };
  }

  return { allowed: true };
}

/**
 * Mark user's free audit as used
 */
export async function markFreeAuditUsed(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ freeAuditUsed: true })
    .where(eq(users.id, userId));
}

/**
 * Check if user can access a specific feature
 */
export async function canAccessFeature(
  userId: string, 
  feature: keyof typeof SUBSCRIPTION_TIERS.free.features
): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  const tier = subscription?.tier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  
  return tierConfig?.features?.[feature] ?? false;
}

/**
 * Get remaining LLM budget for user
 */
export async function getRemainingLLMBudget(userId: string): Promise<number> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return 0;
  
  return Math.max(0, subscription.llmBudgetCents - subscription.llmSpentCents);
}

/**
 * Track LLM usage
 */
export async function trackLLMUsage(userId: string, costCents: number): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      llmSpentCents: costCents, // In production, use SQL increment
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Create or update subscription from Stripe webhook
 */
export async function upsertSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  plan: SubscriptionTier,
  status: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): Promise<void> {
  const tierConfig = SUBSCRIPTION_TIERS[plan];
  const llmBudgetCents = 'llmBudgetCents' in tierConfig ? tierConfig.llmBudgetCents : 0;

  // Check if subscription exists
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        plan,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        llmBudgetCents,
        llmSpentCents: 0, // Reset on new period
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      llmBudgetCents,
      llmSpentCents: 0,
    });
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

/**
 * Get user's audit count
 */
export async function getUserAuditCount(userId: string): Promise<number> {
  const result = await db
    .select()
    .from(audits)
    .where(eq(audits.userId, userId));
  
  return result.length;
}

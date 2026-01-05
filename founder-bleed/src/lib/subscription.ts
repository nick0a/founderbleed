import { db } from '@/lib/db';
import { subscriptions, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getActiveSubscription(userId: string) {
  return await db.query.subscriptions.findFirst({
    where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active')
    )
  });
}

export async function getUser(userId: string) {
    return await db.query.users.findFirst({
        where: eq(users.id, userId)
    });
}

export async function requireSubscription(userId: string, minTier?: 'starter' | 'pro' | 'enterprise') {
  const subscription = await getActiveSubscription(userId);

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'subscription_required' };
  }

  if (minTier) {
    const tierOrder: Record<string, number> = { starter: 1, pro: 2, enterprise: 3 };
    const subTier = subscription.tier || 'starter';
    if ((tierOrder[subTier] || 0) < tierOrder[minTier]) {
      return { allowed: false, reason: 'upgrade_required' };
    }
  }

  return { allowed: true };
}

export async function requireAuditQuota(userId: string) {
  const user = await getUser(userId);
  const subscription = await getActiveSubscription(userId);

  if (user?.freeAuditUsed && !subscription) {
    return { allowed: false, reason: 'free_audit_used' };
  }

  return { allowed: true };
}

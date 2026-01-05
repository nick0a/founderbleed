import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";

const tierOrder: Record<string, number> = {
  starter: 1,
  pro: 2,
  enterprise: 3,
};

function normalizeTier(tier: string | null | undefined) {
  return tier ? tier.toLowerCase() : null;
}

export async function getSubscription(userId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: [desc(subscriptions.createdAt)],
  });
}

export async function getActiveSubscription(userId: string) {
  const subscription = await getSubscription(userId);
  if (!subscription) return null;
  if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") {
    return subscription;
  }
  return null;
}

export async function requireSubscription(
  userId: string,
  minTier?: "starter" | "pro" | "enterprise"
) {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return { allowed: false, reason: "subscription_required" as const };
  }

  if (minTier) {
    const currentTier = normalizeTier(subscription.tier) || "starter";
    if ((tierOrder[currentTier] || 0) < tierOrder[minTier]) {
      return { allowed: false, reason: "upgrade_required" as const };
    }
  }

  return { allowed: true as const };
}

export async function requireAuditQuota(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return { allowed: false, reason: "user_not_found" as const };
  }

  const subscription = await getActiveSubscription(userId);

  if (user.freeAuditUsed && !subscription) {
    return { allowed: false, reason: "free_audit_used" as const };
  }

  return { allowed: true as const };
}

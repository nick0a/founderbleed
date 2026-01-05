import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditRuns,
  byokKeys,
  calendarConnections,
  contacts,
  notifications,
  planningSessions,
  scheduledAudits,
  sharedReports,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { confirm?: string }
    | null;

  if (payload?.confirm !== "DELETE") {
    return NextResponse.json({ error: "confirmation required" }, { status: 400 });
  }

  const userId = session.user.id;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (subscription?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error("Failed to cancel subscription", error);
    }
  }

  await db
    .delete(sharedReports)
    .where(eq(sharedReports.ownerUserId, userId));

  await db
    .delete(contacts)
    .where(or(eq(contacts.userId, userId), eq(contacts.contactUserId, userId)));

  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(planningSessions).where(eq(planningSessions.userId, userId));
  await db.delete(scheduledAudits).where(eq(scheduledAudits.userId, userId));
  await db.delete(byokKeys).where(eq(byokKeys.userId, userId));
  await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  await db.delete(auditRuns).where(eq(auditRuns.userId, userId));

  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { LLM_BUDGET_CENTS, resolveTierFromPrice } from "@/lib/stripe-plans";

function mapStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIALING";
  if (status === "past_due") return "PAST_DUE";
  if (status === "canceled" || status === "unpaid") return "CANCELED";
  return "INCOMPLETE";
}

async function upsertSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  tier,
  status,
  currentPeriodStart,
  currentPeriodEnd,
}: {
  userId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  tier: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });

  const resolvedUserId = userId ?? existing?.userId ?? null;
  const resolvedTier = tier ?? existing?.tier ?? null;
  const resolvedBudget =
    resolvedTier && LLM_BUDGET_CENTS[resolvedTier]
      ? LLM_BUDGET_CENTS[resolvedTier]
      : existing?.llmBudgetCents ?? null;

  const values = {
    userId: resolvedUserId,
    stripeCustomerId,
    stripeSubscriptionId,
    tier: resolvedTier,
    status: status as typeof subscriptions.$inferInsert["status"],
    currentPeriodStart,
    currentPeriodEnd,
    llmBudgetCents: resolvedBudget,
  };

  if (existing) {
    await db
      .update(subscriptions)
      .set({ ...values })
      .where(eq(subscriptions.id, existing.id));
    return;
  }

  await db.insert(subscriptions).values({
    id: randomUUID(),
    ...values,
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing stripe signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature error", error);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string | null;
      if (!subscriptionId) {
        return NextResponse.json({ received: true });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const primaryItem = subscription.items.data[0];
      const priceId = primaryItem?.price.id;
      const tierInfo = priceId ? resolveTierFromPrice(priceId) : null;
      const userId = session.metadata?.userId || null;

      await upsertSubscription({
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        tier: tierInfo?.tier || null,
        status: mapStatus(subscription.status),
        currentPeriodStart: primaryItem?.current_period_start
          ? new Date(primaryItem.current_period_start * 1000)
          : null,
        currentPeriodEnd: primaryItem?.current_period_end
          ? new Date(primaryItem.current_period_end * 1000)
          : null,
      });
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const primaryItem = subscription.items.data[0];
      const priceId = primaryItem?.price.id;
      const tierInfo = priceId ? resolveTierFromPrice(priceId) : null;

      await upsertSubscription({
        userId: null,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        tier: tierInfo?.tier || null,
        status: mapStatus(subscription.status),
        currentPeriodStart: primaryItem?.current_period_start
          ? new Date(primaryItem.current_period_start * 1000)
          : null,
        currentPeriodEnd: primaryItem?.current_period_end
          ? new Date(primaryItem.current_period_end * 1000)
          : null,
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef?.id || null;
      if (subscriptionId) {
        await db
          .update(subscriptions)
          .set({ status: "PAST_DUE" })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling error", error);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}

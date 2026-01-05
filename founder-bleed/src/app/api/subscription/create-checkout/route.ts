import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getPriceId } from "@/lib/stripe-plans";

type CheckoutPayload = {
  tier?: "starter" | "pro" | "enterprise";
  billingPeriod?: "monthly" | "annual";
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as CheckoutPayload | null;
  if (!payload?.tier || !payload?.billingPeriod) {
    return NextResponse.json({ error: "tier and billingPeriod required" }, { status: 400 });
  }

  const priceId = getPriceId(payload.tier, payload.billingPeriod);
  if (!priceId) {
    return NextResponse.json({ error: "price not configured" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "missing app url" }, { status: 500 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer_email: session.user.email || undefined,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/processing?success=true`,
    cancel_url: `${baseUrl}/processing?cancelled=true`,
    metadata: { userId: session.user.id, tier: payload.tier },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getSubscription } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const subscription = await getSubscription(session.user.id);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "subscription not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "missing app url" }, { status: 500 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${baseUrl}/processing`,
  });

  return NextResponse.json({ url: portalSession.url });
}

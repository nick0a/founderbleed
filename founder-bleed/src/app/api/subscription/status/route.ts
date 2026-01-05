import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getSubscription } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const subscription = await getSubscription(session.user.id);
  if (!subscription) {
    return NextResponse.json({ tier: "free", status: "inactive" });
  }

  return NextResponse.json({
    tier: subscription.tier,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { requireSubscription } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await requireSubscription(session.user.id, "starter");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

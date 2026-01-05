import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, sharedReports } from "@/lib/db/schema";

type SharePayload = {
  auditId?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as SharePayload | null;
  if (!payload?.auditId) {
    return NextResponse.json({ error: "auditId required" }, { status: 400 });
  }

  const audit = await db.query.auditRuns.findFirst({
    where: and(eq(auditRuns.id, payload.auditId), eq(auditRuns.userId, session.user.id)),
  });

  if (!audit) {
    return NextResponse.json({ error: "audit not found" }, { status: 404 });
  }

  const shareToken = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sharedReports).values({
    id: randomUUID(),
    auditRunId: audit.id,
    shareToken,
    ownerUserId: session.user.id,
    expiresAt,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "missing app url" }, { status: 500 });
  }

  return NextResponse.json({ shareUrl: `${baseUrl}/share/${shareToken}` });
}

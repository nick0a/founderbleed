import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sharedReports } from "@/lib/db/schema";

type RevokePayload = {
  shareId?: string;
  token?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as RevokePayload | null;
  if (!payload?.shareId && !payload?.token) {
    return NextResponse.json({ error: "shareId or token required" }, { status: 400 });
  }

  const whereClause = payload.shareId
    ? and(
        eq(sharedReports.id, payload.shareId),
        eq(sharedReports.ownerUserId, session.user.id)
      )
    : and(
        eq(sharedReports.shareToken, payload.token || ""),
        eq(sharedReports.ownerUserId, session.user.id)
      );

  await db
    .update(sharedReports)
    .set({ revokedAt: new Date() })
    .where(whereClause);

  return NextResponse.json({ ok: true });
}

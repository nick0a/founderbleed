import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events } from "@/lib/db/schema";

const ALLOWED_TIERS = new Set([
  "UNCLASSIFIED",
  "UNIQUE",
  "FOUNDER",
  "SENIOR",
  "JUNIOR",
  "EA",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    finalTier?: string;
    reconciled?: boolean;
  } | null;

  if (!payload) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, params.id),
  });

  if (!event) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!event.auditRunId) {
    return NextResponse.json({ error: "invalid audit run" }, { status: 400 });
  }

  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, event.auditRunId),
  });

  if (!audit || (audit.userId && audit.userId !== session.user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updates: Partial<typeof events.$inferInsert> = {};

  if (typeof payload.finalTier === "string") {
    const normalized = payload.finalTier.toUpperCase();
    if (!ALLOWED_TIERS.has(normalized)) {
      return NextResponse.json({ error: "invalid tier" }, { status: 400 });
    }
    updates.finalTier = normalized;
  }

  if (typeof payload.reconciled === "boolean") {
    updates.reconciled = payload.reconciled;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  updates.updatedAt = new Date();

  await db.update(events).set(updates).where(eq(events.id, params.id));

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getActiveSubscription, requireAuditQuota } from "@/lib/subscription";
import { runAudit } from "@/lib/audit-runner";

type AuditRequestBody = {
  dateStart?: string;
  dateEnd?: string;
  calendarIds?: string[];
  exclusions?: string[];
};

const DEFAULT_EXCLUSIONS = ["lunch", "gym"];

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const auditQuota = await requireAuditQuota(session.user.id);
  if (!auditQuota.allowed) {
    return NextResponse.json(
      { error: auditQuota.reason },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as AuditRequestBody | null;
  const dateStart = body?.dateStart;
  const dateEnd = body?.dateEnd;

  if (!dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "dateStart and dateEnd required" },
      { status: 400 }
    );
  }

  const startDate = new Date(dateStart);
  const endDate = new Date(dateEnd);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "invalid date range" }, { status: 400 });
  }

  if (endDate < startDate) {
    return NextResponse.json({ error: "dateEnd before dateStart" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const requestedCalendarIds = Array.isArray(body?.calendarIds)
    ? body.calendarIds
    : null;
  const calendarIds =
    requestedCalendarIds && requestedCalendarIds.length > 0
      ? requestedCalendarIds
      : ["primary"];

  const requestedExclusions = Array.isArray(body?.exclusions)
    ? body.exclusions
    : null;
  const storedExclusions = Array.isArray(
    (user.settings as { exclusions?: string[] } | null)?.exclusions
  )
    ? (user.settings as { exclusions?: string[] }).exclusions
    : null;
  const exclusions =
    requestedExclusions && requestedExclusions.length > 0
      ? requestedExclusions
      : storedExclusions && storedExclusions.length > 0
        ? storedExclusions
        : DEFAULT_EXCLUSIONS;

  try {
    const auditResult = await runAudit({
      user,
      userId: session.user.id,
      dateStart: startDate,
      dateEnd: endDate,
      calendarIds,
      exclusions,
      frequency: "manual",
    });

    if (!user.freeAuditUsed) {
      const activeSubscription = await getActiveSubscription(session.user.id);
      if (!activeSubscription) {
        await db
          .update(users)
          .set({ freeAuditUsed: true, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
      }
    }

    return NextResponse.json({
      auditId: auditResult.auditId,
      status: "completed",
      eventCount: auditResult.eventCount,
    });
  } catch (error) {
    console.error("Audit creation error:", error);

    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

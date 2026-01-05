import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  auditRuns,
  notifications,
  scheduledAudits,
  users,
} from "@/lib/db/schema";
import { calculateAuditPeriod, calculateNextRunAt } from "@/lib/audit-schedule";
import { runAudit } from "@/lib/audit-runner";
import { getEvents } from "@/lib/google-calendar";
import { detectLeave } from "@/lib/leave-detection";

const DEFAULT_EXCLUSIONS = ["lunch", "gym"];

async function checkUserOnLeave(
  userId: string,
  calendarIds: string[],
  startDate: Date,
  endDate: Date
) {
  const rawEvents = await getEvents(
    userId,
    calendarIds,
    startDate.toISOString(),
    endDate.toISOString()
  );

  let hasLeave = false;

  for (const event of rawEvents) {
    const leaveResult = detectLeave(
      event.title || "",
      event.description || "",
      event.isAllDay,
      event.eventType
    );

    if (leaveResult.isLeave) {
      hasLeave = true;
      continue;
    }

    return false;
  }

  return hasLeave;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const dueAudits = await db.query.scheduledAudits.findMany({
    where: and(
      eq(scheduledAudits.enabled, true),
      lte(scheduledAudits.nextRunAt, now)
    ),
  });

  let processed = 0;

  for (const scheduled of dueAudits) {
    if (!scheduled.userId) continue;
    const frequency =
      scheduled.frequency === "monthly" || scheduled.frequency === "annual"
        ? scheduled.frequency
        : "weekly";

    const user = await db.query.users.findFirst({
      where: eq(users.id, scheduled.userId),
    });

    if (!user) continue;

    const latestCompleted = await db.query.auditRuns.findFirst({
      where: and(
        eq(auditRuns.userId, scheduled.userId),
        eq(auditRuns.status, "COMPLETED")
      ),
      orderBy: [desc(auditRuns.completedAt), desc(auditRuns.createdAt)],
    });

    const calendarIds =
      latestCompleted?.calendarsIncluded && latestCompleted.calendarsIncluded.length > 0
        ? latestCompleted.calendarsIncluded
        : ["primary"];

    const exclusions =
      latestCompleted?.exclusionsUsed && latestCompleted.exclusionsUsed.length > 0
        ? latestCompleted.exclusionsUsed
        : Array.isArray((user.settings as { exclusions?: string[] } | null)?.exclusions)
          ? ((user.settings as { exclusions?: string[] }).exclusions as string[])
          : DEFAULT_EXCLUSIONS;

    const referenceDate = scheduled.nextRunAt ?? now;
    const { start, end } = calculateAuditPeriod(frequency, referenceDate);

    const onLeave = await checkUserOnLeave(
      scheduled.userId,
      calendarIds,
      start,
      end
    );

    if (onLeave) {
      await db
        .update(scheduledAudits)
        .set({
          lastRunAt: now,
          nextRunAt: calculateNextRunAt({
            frequency,
            dayOfWeek: scheduled.dayOfWeek ?? 6,
            hour: scheduled.hour ?? 3,
            from: now,
          }),
        })
        .where(eq(scheduledAudits.id, scheduled.id));

      await db.insert(notifications).values({
        id: randomUUID(),
        userId: scheduled.userId,
        type: "audit_skipped",
        title: "Audit skipped - you're on leave",
        body: "We detected leave events covering this period. Your next audit is rescheduled.",
        link: "/planning",
        createdAt: now,
      });

      processed += 1;
      continue;
    }

    try {
      const previousEfficiency = latestCompleted
        ? Number((latestCompleted.computedMetrics as { efficiencyScore?: number } | null)?.efficiencyScore || 0)
        : null;

      const auditResult = await runAudit({
        user,
        userId: scheduled.userId,
        dateStart: start,
        dateEnd: end,
        calendarIds,
        exclusions,
        frequency,
      });

      await db
        .update(scheduledAudits)
        .set({
          lastRunAt: now,
          nextRunAt: calculateNextRunAt({
            frequency,
            dayOfWeek: scheduled.dayOfWeek ?? 6,
            hour: scheduled.hour ?? 3,
            from: now,
          }),
        })
        .where(eq(scheduledAudits.id, scheduled.id));

      await db.insert(notifications).values({
        id: randomUUID(),
        userId: scheduled.userId,
        type: "audit_ready",
        title: "Your scheduled audit is ready",
        body: "New audit insights are ready to review.",
        link: `/results/${auditResult.auditId}`,
        createdAt: now,
      });

      const newEfficiency = Math.round(auditResult.metrics.efficiencyScore);
      if (
        previousEfficiency !== null &&
        previousEfficiency - newEfficiency >= 5
      ) {
        await db.insert(notifications).values({
          id: randomUUID(),
          userId: scheduled.userId,
          type: "efficiency_drop",
          title: "Efficiency dipped",
          body: `Efficiency dropped ${previousEfficiency - newEfficiency}% from last audit.`,
          link: `/results/${auditResult.auditId}`,
          createdAt: now,
        });
      }

      processed += 1;
    } catch (error) {
      console.error("Scheduled audit failed", error);
    }
  }

  return NextResponse.json({ processed });
}

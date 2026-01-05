import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, users } from "@/lib/db/schema";
import { getEvents } from "@/lib/google-calendar";
import { classifyEvent } from "@/lib/classification";
import { detectLeave } from "@/lib/leave-detection";
import { calculateMetrics } from "@/lib/metrics";
import {
  calculateEventPlanningScore,
  calculatePlanningScore,
} from "@/lib/planning-score";
import { encrypt } from "@/lib/encryption";

type AuditRequestBody = {
  dateStart?: string;
  dateEnd?: string;
  calendarIds?: string[];
  exclusions?: string[];
};

type ConfidenceLabel = "high" | "medium" | "low";

const DEFAULT_EXCLUSIONS = ["lunch", "gym"];

const DEFAULT_RATES = {
  seniorEngineering: 100000,
  seniorBusiness: 100000,
  juniorEngineering: 50000,
  juniorBusiness: 50000,
  ea: 30000,
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberOrDefault(value: unknown, fallback: number): number {
  return toNumber(value) ?? fallback;
}

function mapTier(tier: string | null | undefined, isSoloFounder: boolean) {
  const normalized = (tier || "senior").toLowerCase();
  if (normalized === "founder" && isSoloFounder) {
    return "UNIQUE";
  }
  if (normalized === "unique") return "UNIQUE";
  if (normalized === "founder") return "FOUNDER";
  if (normalized === "junior") return "JUNIOR";
  if (normalized === "ea") return "EA";
  return "SENIOR";
}

function confidenceToScore(confidence: ConfidenceLabel | null) {
  if (confidence === "high") return 0.9;
  if (confidence === "medium") return 0.6;
  if (confidence === "low") return 0.3;
  return null;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const teamComposition = (user.teamComposition || {}) as Record<string, number>;
  const founderCount = Number(teamComposition.founder || 0);
  const hasOtherRoles = Object.entries(teamComposition).some(
    ([key, value]) => key !== "founder" && Number(value) > 0
  );
  const isSoloFounder = founderCount === 1 && !hasOtherRoles;

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

  const auditId = randomUUID();

  await db.insert(auditRuns).values({
    id: auditId,
    userId: session.user.id,
    startDate,
    endDate,
    calendarsIncluded: calendarIds,
    exclusionsUsed: exclusions,
    status: "PROCESSING",
    algorithmVersion: "1.7",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    const rawEvents = await getEvents(session.user.id, calendarIds, dateStart, dateEnd);
    const processedEvents: typeof events.$inferInsert[] = [];
    const planningEvents: {
      title: string;
      description: string;
      durationMinutes: number;
      isRecurring: boolean;
      isAllDay: boolean;
    }[] = [];
    let leaveDaysDetected = 0;

    for (const raw of rawEvents) {
      const rawTitle = raw.title || "Untitled";
      const rawDescription = raw.description || "";

      const isExcluded = exclusions.some((exclusion) =>
        rawTitle.toLowerCase().includes(exclusion.toLowerCase())
      );
      if (isExcluded) continue;

      const startAt = raw.start ? new Date(raw.start) : null;
      const endAt = raw.end ? new Date(raw.end) : null;

      if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        continue;
      }

      const isAllDay = raw.isAllDay;
      const daySpan = Math.max(
        1,
        Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24))
      );
      const durationMinutes = isAllDay
        ? daySpan * 8 * 60
        : Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60)));

      if (durationMinutes <= 0) continue;

      const leaveResult = detectLeave(
        rawTitle,
        rawDescription,
        isAllDay,
        raw.eventType
      );
      if (leaveResult.isLeave) {
        leaveDaysDetected += daySpan;
      }

      const classification = leaveResult.isLeave
        ? null
        : classifyEvent(rawTitle, rawDescription, raw.attendees, isSoloFounder);

      const suggestedTier = classification?.suggestedTier || null;
      const finalTier = leaveResult.isLeave
        ? "UNCLASSIFIED"
        : mapTier(suggestedTier, isSoloFounder);

      const planningScore = calculateEventPlanningScore({
        title: rawTitle,
        description: rawDescription,
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay,
      });

      planningEvents.push({
        title: rawTitle,
        description: rawDescription,
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay,
      });

      processedEvents.push({
        id: randomUUID(),
        auditRunId: auditId,
        externalEventId: raw.id,
        startAt,
        endAt,
        durationMinutes,
        isAllDay,
        calendarId: raw.calendarId,
        title: encrypt(rawTitle),
        description: rawDescription ? encrypt(rawDescription) : null,
        attendeesCount: raw.attendees,
        hasMeetLink: raw.hasMeetLink,
        isRecurring: raw.isRecurring,
        suggestedTier,
        finalTier,
        tierConfidence: confidenceToScore(classification?.confidence || null),
        businessArea: classification?.businessArea || null,
        vertical: classification?.vertical || null,
        confidenceScore: classification?.confidence || null,
        keywordsMatched: classification?.keywordsMatched || [],
        reconciled: false,
        isLeave: leaveResult.isLeave,
        leaveDetectionMethod: leaveResult.method,
        leaveConfidence: leaveResult.confidence,
        planningScore,
      });
    }

    if (processedEvents.length > 0) {
      await db.insert(events).values(processedEvents);
    }

    const auditDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const metrics = calculateMetrics(
      processedEvents.map((event) => ({
        durationMinutes: event.durationMinutes || 0,
        finalTier: event.finalTier || "SENIOR",
        vertical: event.vertical || "business",
        isLeave: event.isLeave || false,
        startAt: event.isAllDay ? undefined : event.startAt || undefined,
        endAt: event.isAllDay ? undefined : event.endAt || undefined,
      })),
      {
        salaryAnnual: toNumber(user.salaryAnnual),
        equityPercentage: toNumber(user.equityPercentage),
        companyValuation: toNumber(user.companyValuation),
        vestingPeriodYears: toNumber(user.vestingPeriodYears),
        seniorEngineeringRate: toNumberOrDefault(
          user.seniorEngineeringRate,
          DEFAULT_RATES.seniorEngineering
        ),
        seniorBusinessRate: toNumberOrDefault(
          user.seniorBusinessRate,
          DEFAULT_RATES.seniorBusiness
        ),
        juniorEngineeringRate: toNumberOrDefault(
          user.juniorEngineeringRate,
          DEFAULT_RATES.juniorEngineering
        ),
        juniorBusinessRate: toNumberOrDefault(
          user.juniorBusinessRate,
          DEFAULT_RATES.juniorBusiness
        ),
        eaRate: toNumberOrDefault(user.eaRate, DEFAULT_RATES.ea),
      },
      auditDays
    );

    const planningResult = calculatePlanningScore(planningEvents, auditDays);
    const leaveEvents = processedEvents.filter((event) => event.isLeave);
    const leaveHoursExcluded = leaveEvents.reduce(
      (sum, event) => sum + (event.durationMinutes || 0) / 60,
      0
    );

    await db
      .update(auditRuns)
      .set({
        status: "COMPLETED",
        totalEvents: processedEvents.length,
        totalHours: metrics.totalHours,
        uniqueHours: metrics.hoursByTier.unique,
        founderHours: metrics.hoursByTier.founder,
        seniorHours: metrics.hoursByTier.senior,
        juniorHours: metrics.hoursByTier.junior,
        eaHours: metrics.hoursByTier.ea,
        planningScore: planningResult.score,
        annualLoss: metrics.arbitrage,
        computedMetrics: metrics,
        planningAssessment: planningResult.assessment,
        leaveDaysDetected,
        leaveHoursExcluded: String(leaveHoursExcluded),
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(auditRuns.id, auditId));

    return NextResponse.json({
      auditId,
      status: "completed",
      eventCount: processedEvents.length,
    });
  } catch (error) {
    console.error("Audit creation error:", error);
    await db
      .update(auditRuns)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(eq(auditRuns.id, auditId));

    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, users } from "@/lib/db/schema";
import { calculateMetrics } from "@/lib/metrics";

type UserRates = {
  salaryAnnual: number | null;
  equityPercentage: number | null;
  companyValuation: number | null;
  vestingPeriodYears: number | null;
  seniorEngineeringRate: number;
  seniorBusinessRate: number;
  juniorEngineeringRate: number;
  juniorBusinessRate: number;
  eaRate: number;
};

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

function buildUserRates(user: typeof users.$inferSelect): UserRates {
  return {
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
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: auditId } = await params;

  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, auditId),
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.userId && audit.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, auditId),
  });

  const startDate = audit.startDate ?? new Date();
  const endDate = audit.endDate ?? audit.startDate ?? new Date();
  const auditDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const metrics = calculateMetrics(
    auditEvents.map((event) => ({
      durationMinutes: event.durationMinutes || 0,
      finalTier: event.finalTier || "SENIOR",
      vertical: event.vertical || "business",
      isLeave: event.isLeave || false,
      startAt: event.isAllDay ? undefined : event.startAt || undefined,
      endAt: event.isAllDay ? undefined : event.endAt || undefined,
    })),
    buildUserRates(user),
    auditDays
  );

  await db
    .update(auditRuns)
    .set({
      totalEvents: auditEvents.length,
      totalHours: metrics.totalHours,
      uniqueHours: metrics.hoursByTier.unique,
      founderHours: metrics.hoursByTier.founder,
      seniorHours: metrics.hoursByTier.senior,
      juniorHours: metrics.hoursByTier.junior,
      eaHours: metrics.hoursByTier.ea,
      annualLoss: metrics.arbitrage,
      computedMetrics: metrics,
      updatedAt: new Date(),
    })
    .where(eq(auditRuns.id, auditId));

  return NextResponse.json({
    auditId,
    status: "recalculated",
  });
}

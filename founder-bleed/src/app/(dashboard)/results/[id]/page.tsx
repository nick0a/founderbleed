import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";
import { calculateMetrics } from "@/lib/metrics";
import {
  generateRoleRecommendations,
  type TierRates,
} from "@/lib/role-clustering";

import ResultsClient from "./results-client";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberOrDefault(value: unknown, fallback: number): number {
  return toNumber(value) ?? fallback;
}

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

function formatRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) return "Custom Range";
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

export default async function ResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, params.id),
  });

  if (!audit) {
    notFound();
  }

  if (audit.userId && audit.userId !== session.user.id) {
    notFound();
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    notFound();
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, params.id),
  });

  const startDate = audit.startDate ?? null;
  const endDate = audit.endDate ?? startDate ?? null;
  const auditDays = Math.max(
    1,
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 1
  );

  const rates = {
    salaryAnnual: toNumber(user.salaryAnnual),
    equityPercentage: toNumber(user.equityPercentage),
    companyValuation: toNumber(user.companyValuation),
    vestingPeriodYears: toNumber(user.vestingPeriodYears),
    seniorEngineeringRate: toNumberOrDefault(user.seniorEngineeringRate, 100000),
    seniorBusinessRate: toNumberOrDefault(user.seniorBusinessRate, 100000),
    juniorEngineeringRate: toNumberOrDefault(user.juniorEngineeringRate, 50000),
    juniorBusinessRate: toNumberOrDefault(user.juniorBusinessRate, 50000),
    eaRate: toNumberOrDefault(user.eaRate, 30000),
  };

  const metrics = calculateMetrics(
    auditEvents.map((event) => ({
      durationMinutes: event.durationMinutes || 0,
      finalTier: event.finalTier || "SENIOR",
      vertical: event.vertical || "business",
      isLeave: event.isLeave || false,
      startAt: event.isAllDay ? undefined : event.startAt || undefined,
      endAt: event.isAllDay ? undefined : event.endAt || undefined,
    })),
    rates,
    auditDays
  );

  const roleRecommendations = generateRoleRecommendations(
    auditEvents.map((event) => ({
      title: safeDecrypt(event.title) || "Untitled",
      finalTier: event.finalTier || "",
      businessArea: event.businessArea || "Operations",
      vertical: event.vertical || "business",
      durationMinutes: event.durationMinutes || 0,
    })),
    auditDays,
    rates as TierRates
  );

  const eventsForClient = auditEvents.map((event) => ({
    id: event.id,
    title: safeDecrypt(event.title) || "Untitled",
    description: safeDecrypt(event.description),
    startAt: event.startAt ? event.startAt.toISOString() : null,
    endAt: event.endAt ? event.endAt.toISOString() : null,
    durationMinutes: event.durationMinutes || 0,
    finalTier: event.finalTier || null,
    suggestedTier: event.suggestedTier || null,
    businessArea: event.businessArea || null,
    vertical: event.vertical || null,
    reconciled: event.reconciled || false,
    isLeave: event.isLeave || false,
    isAllDay: event.isAllDay || false,
  }));

  const username =
    user.username || user.name || session.user.name || "Founder";

  const planningScore = Number.isFinite(Number(audit.planningScore))
    ? Math.round(Number(audit.planningScore))
    : 0;

  return (
    <ResultsClient
      auditId={audit.id}
      auditDays={auditDays}
      auditRangeLabel={formatRange(startDate, endDate)}
      initialUsername={username}
      hasSalary={rates.salaryAnnual !== null}
      events={eventsForClient}
      initialMetrics={metrics}
      planningScore={planningScore}
      roleRecommendations={roleRecommendations}
      rates={rates}
      teamComposition={(user.teamComposition || {}) as Record<string, number>}
    />
  );
}

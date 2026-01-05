import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditRuns, events, sharedReports, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";
import { calculateMetrics } from "@/lib/metrics";
import { generateRoleRecommendations } from "@/lib/role-clustering";

import ShareClient from "./share-client";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

export default async function SharePage({
  params,
}: {
  params: { token: string };
}) {
  const sharedReport = await db.query.sharedReports.findFirst({
    where: and(eq(sharedReports.shareToken, params.token), isNull(sharedReports.revokedAt)),
  });

  if (!sharedReport) {
    notFound();
  }

  if (sharedReport.expiresAt && sharedReport.expiresAt < new Date()) {
    notFound();
  }

  const audit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, sharedReport.auditRunId || ""),
  });

  if (!audit) {
    notFound();
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, audit.id),
  });

  const owner = sharedReport.ownerUserId
    ? await db.query.users.findFirst({
        where: eq(users.id, sharedReport.ownerUserId),
      })
    : null;

  const startDate = audit.startDate ?? null;
  const endDate = audit.endDate ?? startDate ?? null;
  const auditDays = Math.max(
    1,
    startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 1
  );

  const rates = {
    salaryAnnual: null,
    equityPercentage: null,
    companyValuation: null,
    vestingPeriodYears: null,
    seniorEngineeringRate: Number(owner?.seniorEngineeringRate || 100000),
    seniorBusinessRate: Number(owner?.seniorBusinessRate || 100000),
    juniorEngineeringRate: Number(owner?.juniorEngineeringRate || 50000),
    juniorBusinessRate: Number(owner?.juniorBusinessRate || 50000),
    eaRate: Number(owner?.eaRate || 30000),
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
    rates
  );

  const eventsForClient = auditEvents.map((event) => ({
    id: event.id,
    title: safeDecrypt(event.title) || "Untitled",
    startAt: event.startAt ? event.startAt.toISOString() : null,
    durationMinutes: event.durationMinutes || 0,
    finalTier: event.finalTier || null,
  }));

  return (
    <ShareClient
      shareToken={sharedReport.shareToken}
      auditDays={auditDays}
      planningScore={Number(audit.planningScore || 0)}
      metrics={metrics}
      roleRecommendations={roleRecommendations}
      events={eventsForClient}
    />
  );
}

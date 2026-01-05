import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditRuns,
  events,
  notifications,
  scheduledAudits,
  users,
} from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";
import { classifyEvent } from "@/lib/classification";
import { detectLeave } from "@/lib/leave-detection";
import { getEvents } from "@/lib/google-calendar";
import { getActiveSubscription } from "@/lib/subscription";
import {
  generateRoleRecommendations,
  type TierRates,
} from "@/lib/role-clustering";
import type { AuditMetrics } from "@/lib/metrics";

import DashboardClient from "./dashboard-client";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateLabel(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAuditDays(startDate: Date | null, endDate: Date | null) {
  if (!startDate || !endDate) return 1;
  return (
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1
  );
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function normalizeTier(value: string | null | undefined, isSoloFounder: boolean) {
  const normalized = (value || "senior").toLowerCase();
  if (normalized === "founder" && isSoloFounder) return "UNIQUE";
  if (normalized === "unique") return "UNIQUE";
  if (normalized === "founder") return "FOUNDER";
  if (normalized === "junior") return "JUNIOR";
  if (normalized === "ea") return "EA";
  return "SENIOR";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect("/signin");
  }

  const subscription = await getActiveSubscription(session.user.id);
  const hasSubscription = Boolean(subscription);

  const auditHistory = await db.query.auditRuns.findMany({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
    limit: 6,
  });

  const completedAudits = auditHistory.filter(
    (audit) => audit.status === "COMPLETED"
  );

  const latestAudit = completedAudits[0];
  const previousAudit = completedAudits[1] || null;

  if (!latestAudit) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Run your first audit to unlock dashboard insights.
          </p>
        </div>
      </main>
    );
  }

  const latestMetrics = (latestAudit.computedMetrics || {}) as AuditMetrics;
  const previousMetrics = (previousAudit?.computedMetrics || {}) as AuditMetrics;

  const efficiencyScore = Math.round(toNumber(latestMetrics.efficiencyScore));
  const previousEfficiency = Math.round(toNumber(previousMetrics.efficiencyScore));
  const efficiencyDelta = previousAudit
    ? efficiencyScore - previousEfficiency
    : null;

  const planningScore = Math.round(toNumber(latestAudit.planningScore));
  const now = new Date();

  const reclaimableHoursMonthly = Math.round(
    toNumber(latestMetrics.reclaimableHours) * 4
  );
  const monthlySavings = Number.isFinite(Number(latestAudit.annualLoss))
    ? Math.round(Number(latestAudit.annualLoss) / 12)
    : null;

  const auditDays = calculateAuditDays(latestAudit.startDate, latestAudit.endDate);
  const weeklyMultiplier = auditDays > 0 ? 7 / auditDays : 1;
  const delegableWeeklyHours =
    ((latestMetrics.hoursByTier?.senior || 0) +
      (latestMetrics.hoursByTier?.junior || 0) +
      (latestMetrics.hoursByTier?.ea || 0)) *
    weeklyMultiplier;
  const eaWeeklyHours = (latestMetrics.hoursByTier?.ea || 0) * weeklyMultiplier;

  const latestEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, latestAudit.id),
  });

  const tierRates: TierRates = {
    seniorEngineeringRate: Number(user.seniorEngineeringRate || 100000),
    seniorBusinessRate: Number(user.seniorBusinessRate || 100000),
    juniorEngineeringRate: Number(user.juniorEngineeringRate || 50000),
    juniorBusinessRate: Number(user.juniorBusinessRate || 50000),
    eaRate: Number(user.eaRate || 30000),
  };

  const roleRecommendations = generateRoleRecommendations(
    latestEvents.map((event) => ({
      title: safeDecrypt(event.title) || "Untitled",
      finalTier: event.finalTier || "",
      businessArea: event.businessArea || "Operations",
      vertical: event.vertical || "business",
      durationMinutes: event.durationMinutes || 0,
    })),
    auditDays,
    tierRates
  );

  const topRole = roleRecommendations[0];

  const daysSinceLastAudit = latestAudit.completedAt
    ? Math.ceil(
        (now.getTime() - latestAudit.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const actions = [
    delegableWeeklyHours > 10 && topRole
      ? {
          id: "hire-role",
          title: `Hire ${topRole.roleTitle}`,
          description: "High delegable workload detected in your audit.",
          impact: `Save ${Math.round(delegableWeeklyHours)} hrs/week`,
          href: "/results/" + latestAudit.id,
          priority: 1,
        }
      : null,
    eaWeeklyHours > 5
      ? {
          id: "hire-ea",
          title: "Hire an EA",
          description: "Admin work is consuming a large portion of your week.",
          impact: `Save ${Math.round(eaWeeklyHours)} hrs/week`,
          href: "/results/" + latestAudit.id,
          priority: 2,
        }
      : null,
    planningScore < 50
      ? {
          id: "improve-planning",
          title: "Improve calendar planning",
          description: "Low planning score suggests meeting hygiene gaps.",
          impact: `Score is ${planningScore}%`,
          href: "/planning",
          priority: 3,
        }
      : null,
    efficiencyDelta !== null && efficiencyDelta < 0
      ? {
          id: "review-efficiency",
          title: "Review time allocation",
          description: "Efficiency is trending down compared to last audit.",
          impact: `Down ${Math.abs(efficiencyDelta)}%`,
          href: "/results/" + latestAudit.id,
          priority: 4,
        }
      : null,
    daysSinceLastAudit !== null && daysSinceLastAudit > 30
      ? {
          id: "run-audit",
          title: "Run fresh audit",
          description: "It has been a while since your last audit.",
          impact: `${daysSinceLastAudit} days ago`,
          href: "/processing",
          priority: 5,
        }
      : null,
  ]
    .filter(Boolean)
    .sort((a, b) => (a?.priority || 0) - (b?.priority || 0))
    .slice(0, 3) as Array<{
    id: string;
    title: string;
    description: string;
    impact: string;
    href: string;
    priority: number;
  }>;

  const teamComposition = (user.teamComposition || {}) as Record<string, number>;
  const founderCount = Number(teamComposition.founder || 0);
  const hasOtherRoles = Object.entries(teamComposition).some(
    ([key, value]) => key !== "founder" && Number(value) > 0
  );
  const soloFounder = founderCount === 1 && !hasOtherRoles;

  const calendarIds =
    latestAudit.calendarsIncluded && latestAudit.calendarsIncluded.length > 0
      ? latestAudit.calendarsIncluded
      : ["primary"];

  const weekStartDate = startOfWeek(new Date());
  const weekEndDate = addDays(weekStartDate, 7);

  let weekEvents: Array<{
    id: string;
    title: string;
    startAt: string | null;
    endAt: string | null;
    finalTier: string;
  }> = [];

  try {
    const previewEvents = await getEvents(
      session.user.id,
      calendarIds,
      weekStartDate.toISOString(),
      weekEndDate.toISOString()
    );

    weekEvents = previewEvents.map((event) => {
      const leaveResult = detectLeave(
        event.title,
        event.description,
        event.isAllDay,
        event.eventType
      );
      const classification = leaveResult.isLeave
        ? null
        : classifyEvent(event.title, event.description, event.attendees, soloFounder);
      return {
        id: event.id,
        title: event.title || "Untitled",
        startAt: event.start || null,
        endAt: event.end || null,
        finalTier: normalizeTier(classification?.suggestedTier, soloFounder),
      };
    });
  } catch (error) {
    console.error("Weekly preview fetch failed", error);
    weekEvents = latestEvents.map((event) => ({
      id: event.id,
      title: safeDecrypt(event.title) || "Untitled",
      startAt: event.startAt ? event.startAt.toISOString() : null,
      endAt: event.endAt ? event.endAt.toISOString() : null,
      finalTier: event.finalTier || "SENIOR",
    }));
  }

  const recentAudits = auditHistory.slice(0, 5).map((audit) => ({
    id: audit.id,
    status: audit.status,
    dateLabel: formatDateLabel(audit.completedAt || audit.createdAt),
    efficiencyScore: Math.round(
      toNumber((audit.computedMetrics as AuditMetrics | null)?.efficiencyScore)
    ),
  }));

  const notificationsList = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 10,
  });

  const unreadCount = notificationsList.filter((notice) => !notice.readAt).length;

  const schedule = await db.query.scheduledAudits.findFirst({
    where: eq(scheduledAudits.userId, session.user.id),
  });

  const comparison = {
    current: {
      efficiencyScore,
      planningScore,
      arbitrage: Number.isFinite(Number(latestAudit.annualLoss))
        ? Math.round(Number(latestAudit.annualLoss))
        : null,
      hoursByTier: latestMetrics.hoursByTier || {
        unique: 0,
        founder: 0,
        senior: 0,
        junior: 0,
        ea: 0,
      },
    },
    previous: previousAudit
      ? {
          efficiencyScore: previousEfficiency,
          planningScore: Math.round(toNumber(previousAudit.planningScore)),
          arbitrage: Number.isFinite(Number(previousAudit.annualLoss))
            ? Math.round(Number(previousAudit.annualLoss))
            : null,
          hoursByTier: previousMetrics.hoursByTier || {
            unique: 0,
            founder: 0,
            senior: 0,
            junior: 0,
            ea: 0,
          },
        }
      : null,
  };

  return (
    <DashboardClient
      hasSubscription={hasSubscription}
      latestAuditId={latestAudit.id}
      efficiencyScore={efficiencyScore}
      efficiencyDelta={efficiencyDelta}
      planningScore={planningScore}
      reclaimableHoursMonthly={reclaimableHoursMonthly}
      monthlySavings={monthlySavings}
      actions={actions}
      weekEvents={weekEvents}
      recentAudits={recentAudits}
      comparison={comparison}
      notifications={notificationsList.map((notice) => ({
        id: notice.id,
        title: notice.title,
        body: notice.body || "",
        link: notice.link || "",
        readAt: notice.readAt ? notice.readAt.toISOString() : null,
        createdAt: notice.createdAt ? notice.createdAt.toISOString() : null,
      }))}
      unreadCount={unreadCount}
      schedule={schedule
        ? {
            id: schedule.id,
            frequency: schedule.frequency || "weekly",
            enabled: schedule.enabled ?? true,
            dayOfWeek: schedule.dayOfWeek ?? 6,
            hour: schedule.hour ?? 3,
            nextRunAt: schedule.nextRunAt ? schedule.nextRunAt.toISOString() : null,
          }
        : null}
      showSubscribeBanner={!hasSubscription}
    />
  );
}

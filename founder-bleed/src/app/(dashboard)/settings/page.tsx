import { redirect } from "next/navigation";
import { and, desc, eq, inArray, or } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditRuns,
  byokKeys,
  calendarConnections,
  contacts,
  sharedReports,
  scheduledAudits,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";

import SettingsClient from "./settings-client";

function maskKey(value: string) {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-4)}`;
}

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

export default async function SettingsPage() {
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

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
    orderBy: [desc(subscriptions.createdAt)],
  });

  const calendarConnection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  const schedule = await db.query.scheduledAudits.findFirst({
    where: eq(scheduledAudits.userId, session.user.id),
  });

  const byok = await db.query.byokKeys.findMany({
    where: eq(byokKeys.userId, session.user.id),
  });

  const byokKeysMasked = byok.map((key) => ({
    id: key.id,
    provider: key.provider || "openai",
    priority: key.priority || "budget_first",
    masked: maskKey(safeDecrypt(key.apiKeyEncrypted) || "***"),
  }));

  const shareReports = await db.query.sharedReports.findMany({
    where: eq(sharedReports.ownerUserId, session.user.id),
    orderBy: [desc(sharedReports.createdAt)],
  });

  const contactRows = await db.query.contacts.findMany({
    where: or(
      eq(contacts.userId, session.user.id),
      eq(contacts.contactUserId, session.user.id)
    ),
  });

  const contactUserIds = Array.from(
    new Set(
      contactRows
        .flatMap((row) => [row.userId, row.contactUserId])
        .filter(
          (id): id is string =>
            Boolean(id) && id !== session.user.id
        )
    )
  );

  const contactUsers = contactUserIds.length
    ? await db.query.users.findMany({
        where: inArray(users.id, contactUserIds),
      })
    : [];

  const contactUserMap = new Map(
    contactUsers.map((contactUser) => [contactUser.id, contactUser])
  );

  const acceptedContacts = contactRows.filter(
    (row) => row.status === "accepted" && row.userId === session.user.id
  );

  const leaderboard = await Promise.all(
    acceptedContacts.map(async (row) => {
      if (!row.contactUserId) return null;
      const contactUser = contactUserMap.get(row.contactUserId);
      if (!contactUser) return null;

      const audits = await db.query.auditRuns.findMany({
        where: and(
          eq(auditRuns.userId, row.contactUserId),
          eq(auditRuns.status, "COMPLETED")
        ),
        orderBy: [desc(auditRuns.completedAt), desc(auditRuns.createdAt)],
        limit: 2,
      });

      const latest = audits[0];
      const previous = audits[1];
      const latestMetrics = (latest?.computedMetrics || {}) as {
        efficiencyScore?: number;
      };
      const previousMetrics = (previous?.computedMetrics || {}) as {
        efficiencyScore?: number;
      };

      const privacy = ((contactUser.settings || {}) as { privacy?: { shareScores?: boolean; anonymousMode?: boolean } }).privacy;
      const shareScores = privacy?.shareScores ?? true;
      const anonymous = privacy?.anonymousMode ?? false;

      return {
        id: row.contactUserId,
        name: anonymous
          ? "Anonymous Founder"
          : contactUser.username || contactUser.name || contactUser.email,
        efficiencyScore: shareScores
          ? Math.round(Number(latestMetrics.efficiencyScore || 0))
          : null,
        planningScore: shareScores
          ? Math.round(Number(latest?.planningScore || 0))
          : null,
        improvement: shareScores
          ? Math.round(
              (Number(latestMetrics.efficiencyScore || 0) -
                Number(previousMetrics.efficiencyScore || 0))
            )
          : null,
      };
    })
  );

  const privacySettings =
    ((user.settings || {}) as {
      privacy?: { shareScores?: boolean; anonymousMode?: boolean };
    }).privacy || {};

  const team = (user.teamComposition || {}) as Record<string, number>;

  return (
    <SettingsClient
      user={{
        email: user.email,
        name: user.name || "",
        username: user.username || "",
        currency: user.currency || "USD",
        salaryAnnual: user.salaryAnnual ? Number(user.salaryAnnual) : null,
        salaryInputMode: user.salaryInputMode === "hourly" ? "hourly" : "annual",
        companyValuation: user.companyValuation ? Number(user.companyValuation) : null,
        equityPercentage: user.equityPercentage ? Number(user.equityPercentage) : null,
        vestingPeriodYears: user.vestingPeriodYears ? Number(user.vestingPeriodYears) : null,
        rates: {
          seniorEngineeringRate: Number(user.seniorEngineeringRate || 100000),
          seniorBusinessRate: Number(user.seniorBusinessRate || 100000),
          juniorEngineeringRate: Number(user.juniorEngineeringRate || 50000),
          juniorBusinessRate: Number(user.juniorBusinessRate || 50000),
          eaRate: Number(user.eaRate || 30000),
        },
        teamComposition: {
          founder: Number(team.founder || 1),
          seniorEngineering: Number(team.seniorEngineering || 0),
          juniorEngineering: Number(team.juniorEngineering || 0),
          qaEngineering: Number(team.qaEngineering || 0),
          seniorBusiness: Number(team.seniorBusiness || 0),
          juniorBusiness: Number(team.juniorBusiness || 0),
          ea: Number(team.ea || 0),
        },
        notificationPreferences: {
          email_audit_ready:
            (user.notificationPreferences as { email_audit_ready?: boolean } | null)
              ?.email_audit_ready ?? true,
          email_weekly_digest:
            (user.notificationPreferences as { email_weekly_digest?: boolean } | null)
              ?.email_weekly_digest ?? true,
          in_app_audit_ready:
            (user.notificationPreferences as { in_app_audit_ready?: boolean } | null)
              ?.in_app_audit_ready ?? true,
        },
        privacy: {
          shareScores: privacySettings.shareScores ?? true,
          anonymousMode: privacySettings.anonymousMode ?? false,
        },
      }}
      subscription={
        subscription
          ? {
              tier: subscription.tier || "free",
              status: subscription.status || "INACTIVE",
              currentPeriodEnd: subscription.currentPeriodEnd
                ? subscription.currentPeriodEnd.toISOString()
                : null,
              llmBudgetCents: subscription.llmBudgetCents || 0,
              llmSpentCents: subscription.llmSpentCents || 0,
            }
          : null
      }
      byokKeys={byokKeysMasked}
      calendarConnection={
        calendarConnection
          ? {
              hasWriteAccess: calendarConnection.hasWriteAccess ?? false,
              email: user.email,
            }
          : null
      }
      schedule={
        schedule
          ? {
              id: schedule.id,
              frequency: schedule.frequency || "weekly",
              enabled: schedule.enabled ?? false,
              dayOfWeek: schedule.dayOfWeek ?? 6,
              hour: schedule.hour ?? 3,
              timezone: schedule.timezone || "UTC",
              nextRunAt: schedule.nextRunAt ? schedule.nextRunAt.toISOString() : null,
            }
          : null
      }
      sharedReports={shareReports.map((report) => ({
        id: report.id,
        shareToken: report.shareToken,
        createdAt: report.createdAt ? report.createdAt.toISOString() : null,
        revokedAt: report.revokedAt ? report.revokedAt.toISOString() : null,
      }))}
      contacts={{
        sent: contactRows
          .filter((row) => row.userId === session.user.id && row.status === "pending")
          .map((row) => ({
            id: row.id,
            email: row.contactEmail || contactUserMap.get(row.contactUserId || "")?.email || "",
          })),
        received: contactRows
          .filter((row) => row.contactUserId === session.user.id && row.status === "pending")
          .map((row) => ({
            id: row.id,
            email: contactUserMap.get(row.userId || "")?.email || row.contactEmail || "",
            name: contactUserMap.get(row.userId || "")?.name || "",
          })),
        accepted: acceptedContacts.map((row) => ({
          id: row.id,
          name: contactUserMap.get(row.contactUserId || "")?.name || "",
          email: contactUserMap.get(row.contactUserId || "")?.email || "",
        })),
        leaderboard: leaderboard.filter(Boolean) as Array<{
          id: string;
          name: string;
          efficiencyScore: number | null;
          planningScore: number | null;
          improvement: number | null;
        }>,
      }}
    />
  );
}

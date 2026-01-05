import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events, roleRecommendations, users } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const audits = await db.query.auditRuns.findMany({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
  });

  const auditIds = audits.map((audit) => audit.id);
  const auditEvents = auditIds.length
    ? await db.query.events.findMany({
        where: inArray(events.auditRunId, auditIds),
      })
    : [];

  const recommendations = auditIds.length
    ? await db.query.roleRecommendations.findMany({
        where: inArray(roleRecommendations.auditRunId, auditIds),
      })
    : [];

  const eventsByAudit = new Map<string, typeof auditEvents>();
  for (const event of auditEvents) {
    const key = event.auditRunId || "";
    if (!eventsByAudit.has(key)) eventsByAudit.set(key, []);
    eventsByAudit.get(key)?.push(event);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      currency: user.currency,
      teamComposition: user.teamComposition,
      notificationPreferences: user.notificationPreferences,
      settings: user.settings,
    },
    auditRuns: audits.map((audit) => ({
      id: audit.id,
      dateStart: audit.startDate?.toISOString() || null,
      dateEnd: audit.endDate?.toISOString() || null,
      metrics: audit.computedMetrics,
      planningScore: audit.planningScore,
      events: (eventsByAudit.get(audit.id) || []).map((event) => ({
        id: event.id,
        title: safeDecrypt(event.title) || "Untitled",
        description: safeDecrypt(event.description),
        startAt: event.startAt?.toISOString() || null,
        endAt: event.endAt?.toISOString() || null,
        durationMinutes: event.durationMinutes,
        tier: event.finalTier,
        planningScore: event.planningScore,
      })),
    })),
    roleRecommendations: recommendations.map((role) => ({
      id: role.id,
      auditRunId: role.auditRunId,
      roleTitle: role.roleTitle,
      roleTier: role.roleTier,
      hoursPerWeek: role.hoursPerWeek,
      costMonthly: role.costMonthly,
      tasks: role.tasksList,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=founder-bleed-export.json",
    },
  });
}

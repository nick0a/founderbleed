import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditRuns,
  calendarConnections,
  events,
  users,
} from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";
import { requireSubscription } from "@/lib/subscription";

import PlanningClient from "./planning-client";

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

function coerceNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const access = await requireSubscription(session.user.id, "starter");

  if (!access.allowed) {
    return (
      <main className="min-h-screen bg-background">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Upgrade Required
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Planning Assistant is paid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upgrade to unlock AI planning, automation, and continuous audits.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Starter</p>
                <p className="text-muted-foreground">$20/seat/month · Community support</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Pro</p>
                <p className="text-muted-foreground">$50/seat/month · Email support</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold">Enterprise</p>
                <p className="text-muted-foreground">$90/seat/month · Priority support</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Link
                href="/processing"
                className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"
              >
                Maybe later
              </Link>
              <Link
                href="/"
                className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect("/signin");
  }

  const latestAudit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
  });

  if (!latestAudit) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-2xl font-semibold">Planning Assistant</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Run your first audit to unlock AI planning.
          </p>
          <Link
            href="/processing"
            className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Start an audit
          </Link>
        </div>
      </main>
    );
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, latestAudit.id),
  });

  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  const teamComposition = (user.teamComposition || {}) as Record<string, number>;
  const founderCount = Number(teamComposition.founder || 0);
  const hasOtherRoles = Object.entries(teamComposition).some(
    ([key, value]) => key !== "founder" && Number(value) > 0
  );
  const isSoloFounder = founderCount === 1 && !hasOtherRoles;

  const planningScore = Math.round(coerceNumber(latestAudit.planningScore));
  const computedMetrics = (latestAudit.computedMetrics || {}) as Record<
    string,
    unknown
  >;
  const efficiencyScore = Math.round(coerceNumber(computedMetrics.efficiencyScore));

  const eventsForClient = auditEvents.map((event) => ({
    id: event.id,
    title: safeDecrypt(event.title) || "Untitled",
    startAt: event.startAt ? event.startAt.toISOString() : null,
    endAt: event.endAt ? event.endAt.toISOString() : null,
    durationMinutes: event.durationMinutes || 0,
    finalTier: event.finalTier || "SENIOR",
    planningScore: Math.round(coerceNumber(event.planningScore)),
    isAllDay: event.isAllDay || false,
  }));

  const focusDate =
    latestAudit.endDate?.toISOString() || new Date().toISOString();

  return (
    <PlanningClient
      auditId={latestAudit.id}
      planningScore={planningScore}
      efficiencyScore={efficiencyScore}
      events={eventsForClient}
      hasWriteAccess={Boolean(connection?.hasWriteAccess)}
      initialFocusDate={focusDate}
      isSoloFounder={isSoloFounder}
    />
  );
}

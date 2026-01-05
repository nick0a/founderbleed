"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AuditMetrics } from "@/lib/metrics";
import type { RoleRecommendation } from "@/lib/role-clustering";

type SharedEvent = {
  id: string;
  title: string;
  startAt: string | null;
  durationMinutes: number;
  finalTier: string | null;
};

type ShareClientProps = {
  shareToken: string;
  auditDays: number;
  planningScore: number;
  metrics: AuditMetrics;
  roleRecommendations: RoleRecommendation[];
  events: SharedEvent[];
};

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "0";
  return `${Math.round(value * 10) / 10}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0h";
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}

export default function ShareClient({
  shareToken,
  planningScore,
  metrics,
  roleRecommendations,
  events,
}: ShareClientProps) {
  const searchParams = useSearchParams();
  const verifiedParam = searchParams.get("verified") === "true";
  const [verified, setVerified] = useState(verifiedParam);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const totalHours = metrics.totalHours || 0;
  const tierBreakdown = [
    { key: "unique", label: "Unique", hours: metrics.hoursByTier.unique },
    { key: "founder", label: "Founder", hours: metrics.hoursByTier.founder },
    { key: "senior", label: "Senior", hours: metrics.hoursByTier.senior },
    { key: "junior", label: "Junior", hours: metrics.hoursByTier.junior },
    { key: "ea", label: "EA", hours: metrics.hoursByTier.ea },
  ];

  const gatedView = !verified;

  async function requestAccess() {
    if (!email.trim()) return;
    setStatus("sending");

    const response = await fetch("/api/share/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: shareToken, email }),
    });

    const data = (await response.json().catch(() => null)) as { status?: string } | null;
    if (response.ok && data?.status === "verified") {
      setVerified(true);
    } else {
      setStatus("sent");
    }
  }

  if (gatedView) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 px-6 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Founder Bleed
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Enter your email to view the report</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We will send a verification link before showing the full report.
          </p>
          <div className="mt-6 space-y-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button className="w-full" onClick={requestAccess} disabled={status === "sending"}>
              {status === "sending" ? "Sending..." : "Send verification"}
            </Button>
            {status === "sent" && (
              <p className="text-xs text-muted-foreground">
                Check your email for the verification link, then return here.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Shared Report
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Founder Bleed Audit Summary</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Compensation details are hidden in shared reports.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Annual Arbitrage
            </p>
            <p className="mt-3 text-2xl font-semibold">Private</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reclaimable Hours
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {formatHours(metrics.reclaimableHours)} hrs/week
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Efficiency Score
            </p>
            <p className="mt-3 text-2xl font-semibold">{metrics.efficiencyScore}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Planning Score
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {Math.max(0, Math.min(100, Math.round(planningScore)))}%
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tier Breakdown</h2>
              <p className="text-sm text-muted-foreground">
                Hours by delegation tier.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Total hours: {formatHours(totalHours)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
            {tierBreakdown.map((tier) => {
              const percentage =
                totalHours > 0 ? Math.round((tier.hours / totalHours) * 100) : 0;
              return (
                <div key={tier.key} className="flex items-center justify-between">
                  <span>{tier.label}</span>
                  <span className="font-semibold">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Role Recommendations</h2>
          <p className="text-sm text-muted-foreground">
            Suggested roles based on the audit.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {roleRecommendations.map((role) => (
              <div key={role.id} className="rounded-2xl border border-border bg-background p-5">
                <h3 className="text-lg font-semibold">{role.roleTitle}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {role.hoursPerWeek} hrs/week · ${role.costMonthly}/month
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {role.tasks.slice(0, 5).map((task) => (
                    <div key={`${role.id}-${task.task}`} className="flex justify-between">
                      <span>{task.task}</span>
                      <span>{formatHours(task.hoursPerWeek)} hrs/week</span>
                    </div>
                  ))}
                </div>
                <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {role.jdText}
                </pre>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Event Table</h2>
          <p className="text-sm text-muted-foreground">
            Read-only view of events in this audit.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-3 pr-4">Title</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3">Tier</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{event.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(event.startAt)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDuration(event.durationMinutes)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {event.finalTier || "SENIOR"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Get your own audit</h2>
              <p className="text-sm text-muted-foreground">
                Start a personalized audit to reclaim your time.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Start your audit</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

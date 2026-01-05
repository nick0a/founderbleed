"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { calculateMetrics, type AuditMetrics } from "@/lib/metrics";
import {
  buildJobDescription,
  recalculateRole,
  type RoleRecommendation,
  type TierRates,
} from "@/lib/role-clustering";

type EventItem = {
  id: string;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  finalTier: string | null;
  suggestedTier: string | null;
  businessArea: string | null;
  vertical: string | null;
  reconciled: boolean;
  isLeave: boolean;
  isAllDay: boolean;
};

type MetricsRates = TierRates & {
  salaryAnnual: number | null;
  equityPercentage: number | null;
  companyValuation: number | null;
  vestingPeriodYears: number | null;
};

type ResultsClientProps = {
  auditId: string;
  auditDays: number;
  auditRangeLabel: string;
  initialUsername: string;
  hasSalary: boolean;
  events: EventItem[];
  initialMetrics: AuditMetrics;
  planningScore: number;
  roleRecommendations: RoleRecommendation[];
  rates: MetricsRates;
  teamComposition: Record<string, number>;
};

type SortKey = "date" | "duration" | "tier";

const NAME_STORAGE_KEY = "founderbleed:username";

const TIER_LABELS: Record<string, string> = {
  UNIQUE: "Unique",
  FOUNDER: "Founder",
  SENIOR: "Senior",
  JUNIOR: "Junior",
  EA: "EA",
  UNCLASSIFIED: "Unclassified",
};

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}`;
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
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}

function buildTierOptions(isSoloFounder: boolean) {
  const tiers = ["UNIQUE", "FOUNDER", "SENIOR", "JUNIOR", "EA"];
  return isSoloFounder ? tiers.filter((tier) => tier !== "FOUNDER") : tiers;
}

export default function ResultsClient({
  auditId,
  auditDays,
  auditRangeLabel,
  initialUsername,
  hasSalary,
  events: initialEvents,
  initialMetrics,
  planningScore,
  roleRecommendations: initialRoles,
  rates,
  teamComposition,
}: ResultsClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState(() => {
    if (typeof window === "undefined") return initialUsername;
    const stored = window.localStorage.getItem(NAME_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : initialUsername;
  });
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [metrics, setMetrics] = useState<AuditMetrics>(initialMetrics);
  const [roles, setRoles] = useState<RoleRecommendation[]>(initialRoles);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dragRoleId, setDragRoleId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{
    roleId: string;
    taskIndex: number;
  } | null>(null);

  const isSoloFounder =
    Number(teamComposition?.founder || 0) === 1 &&
    Object.entries(teamComposition || {}).every(
      ([key, value]) => key === "founder" || Number(value) === 0
    );

  const tierOptions = buildTierOptions(isSoloFounder);

  useEffect(() => {
    if (username.trim().length === 0) return;
    window.localStorage.setItem(NAME_STORAGE_KEY, username.trim());
  }, [username]);

  const reconciledCount = useMemo(
    () => events.filter((event) => event.reconciled).length,
    [events]
  );

  const totalEvents = events.length;

  const hoursByTier = metrics.hoursByTier;
  const totalHours = metrics.totalHours || 0;

  const tierBreakdown = [
    { key: "unique", label: "Unique", hours: hoursByTier.unique, color: "bg-[color:var(--chart-1)]" },
    { key: "founder", label: "Founder", hours: hoursByTier.founder, color: "bg-[color:var(--chart-2)]" },
    { key: "senior", label: "Senior", hours: hoursByTier.senior, color: "bg-[color:var(--chart-3)]" },
    { key: "junior", label: "Junior", hours: hoursByTier.junior, color: "bg-[color:var(--chart-4)]" },
    { key: "ea", label: "EA", hours: hoursByTier.ea, color: "bg-[color:var(--chart-5)]" },
  ];

  const annualLoss = metrics.arbitrage ?? null;
  const heroValue = hasSalary ? formatCurrency(annualLoss) : null;

  const sortedEvents = useMemo(() => {
    const copy = [...events];
    const direction = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === "duration") {
        return (a.durationMinutes - b.durationMinutes) * direction;
      }
      if (sortKey === "tier") {
        return (a.finalTier || "").localeCompare(b.finalTier || "") * direction;
      }
      const timeA = a.startAt ? new Date(a.startAt).getTime() : 0;
      const timeB = b.startAt ? new Date(b.startAt).getTime() : 0;
      return (timeA - timeB) * direction;
    });
    return copy;
  }, [events, sortKey, sortDir]);

  async function persistEventUpdate(eventId: string, payload: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function recalculateAudit() {
    await fetch(`/api/audit/${auditId}/recalculate`, { method: "POST" });
  }

  function refreshMetrics(updatedEvents: EventItem[]) {
    const calculated = calculateMetrics(
      updatedEvents.map((event) => ({
        durationMinutes: event.durationMinutes || 0,
        finalTier: event.finalTier || "SENIOR",
        vertical: event.vertical || "business",
        isLeave: event.isLeave,
        startAt: event.isAllDay
          ? undefined
          : event.startAt
            ? new Date(event.startAt)
            : undefined,
        endAt: event.isAllDay
          ? undefined
          : event.endAt
            ? new Date(event.endAt)
            : undefined,
      })),
      {
        salaryAnnual: rates.salaryAnnual,
        equityPercentage: rates.equityPercentage,
        companyValuation: rates.companyValuation,
        vestingPeriodYears: rates.vestingPeriodYears,
        seniorEngineeringRate: rates.seniorEngineeringRate,
        seniorBusinessRate: rates.seniorBusinessRate,
        juniorEngineeringRate: rates.juniorEngineeringRate,
        juniorBusinessRate: rates.juniorBusinessRate,
        eaRate: rates.eaRate,
      },
      auditDays
    );

    setMetrics(calculated);
  }

  async function handleTierChange(eventId: string, value: string) {
    setEvents((prev) => {
      const updated = prev.map((event) =>
        event.id === eventId ? { ...event, finalTier: value } : event
      );
      refreshMetrics(updated);
      return updated;
    });

    try {
      await persistEventUpdate(eventId, { finalTier: value });
      await recalculateAudit();
      router.refresh();
    } catch (error) {
      console.error("Failed to update tier", error);
    }
  }

  async function handleReconcile(eventId: string) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, reconciled: true } : event
      )
    );
    try {
      await persistEventUpdate(eventId, { reconciled: true });
    } catch (error) {
      console.error("Failed to reconcile event", error);
    }
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir("asc");
  }

  function toggleRole(roleId: string) {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  }

  async function copyJobDescription(roleId: string) {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    try {
      await navigator.clipboard.writeText(role.jdText || buildJobDescription(role));
      setCopiedRole(roleId);
      setTimeout(() => setCopiedRole(null), 2000);
    } catch (error) {
      console.error("Failed to copy job description", error);
    }
  }

  function reorderRoles(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setRoles((prev) => {
      const sourceIndex = prev.findIndex((role) => role.id === sourceId);
      const targetIndex = prev.findIndex((role) => role.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  }

  function handleRoleDrop(targetId: string) {
    if (!dragRoleId) return;
    reorderRoles(dragRoleId, targetId);
    setDragRoleId(null);
  }

  function handleTaskDrop(targetRoleId: string) {
    if (!draggedTask) return;
    const { roleId, taskIndex } = draggedTask;
    if (roleId === targetRoleId) {
      setDraggedTask(null);
      return;
    }

    setRoles((prev) => {
      const sourceIndex = prev.findIndex((role) => role.id === roleId);
      const targetIndex = prev.findIndex((role) => role.id === targetRoleId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;

      const sourceRole = prev[sourceIndex];
      const targetRole = prev[targetIndex];
      const task = sourceRole.tasks[taskIndex];
      if (!task) return prev;

      const next = [...prev];
      const nextSource = recalculateRole(
        {
          ...sourceRole,
          tasks: sourceRole.tasks.filter((_, index) => index !== taskIndex),
        },
        rates
      );
      const nextTarget = recalculateRole(
        { ...targetRole, tasks: [...targetRole.tasks, task] },
        rates
      );

      next[sourceIndex] = nextSource;
      next[targetIndex] = nextTarget;
      return next;
    });

    setDraggedTask(null);
  }

  const showRoleDrag = roles.length > 1;

  const teamRows = useMemo(() => {
    const normalizedDays = Math.max(1, auditDays);
    const weeklyMultiplier = 7 / normalizedDays;
    const rows: {
      label: string;
      count: number;
      tasks: string;
      savings: string;
    }[] = [];

    const hourly = {
      senior: metrics.hoursByTier.senior,
      junior: metrics.hoursByTier.junior,
      ea: metrics.hoursByTier.ea,
    };

    const seniorCount =
      Number(teamComposition?.seniorEngineering || 0) +
      Number(teamComposition?.seniorBusiness || 0);
    const juniorCount =
      Number(teamComposition?.juniorEngineering || 0) +
      Number(teamComposition?.juniorBusiness || 0);
    const eaCount = Number(teamComposition?.ea || 0);

    if (eaCount > 0) {
      const hours = Math.max(0, hourly.ea * weeklyMultiplier);
      const savings = formatCurrency((rates.eaRate * (hours / 40)) / 12) || "$0";
      rows.push({
        label: "EA",
        count: eaCount,
        tasks: "Scheduling, expenses, admin requests",
        savings: `${formatHours(hours)} hrs/week, ${savings}/month`,
      });
    }

    if (seniorCount > 0) {
      const hours = Math.max(0, hourly.senior * weeklyMultiplier);
      const monthly =
        (rates.seniorBusinessRate * (hours / 40)) / 12;
      rows.push({
        label: "Senior",
        count: seniorCount,
        tasks: "Project planning, execution oversight",
        savings: `${formatHours(hours)} hrs/week, ${formatCurrency(monthly) || "$0"}/month`,
      });
    }

    if (juniorCount > 0) {
      const hours = Math.max(0, hourly.junior * weeklyMultiplier);
      const monthly =
        (rates.juniorBusinessRate * (hours / 40)) / 12;
      rows.push({
        label: "Junior",
        count: juniorCount,
        tasks: "Documentation, follow-ups, QA checks",
        savings: `${formatHours(hours)} hrs/week, ${formatCurrency(monthly) || "$0"}/month`,
      });
    }

    return rows;
  }, [auditDays, metrics.hoursByTier, rates, teamComposition]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Founder Bleed Results
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Audit for</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  suppressHydrationWarning
                  className="min-w-[160px] rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold text-foreground shadow-sm"
                />
                <span className="rounded-full border border-border px-3 py-1 text-xs">
                  {auditRangeLabel}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs text-muted-foreground shadow-sm">
              {totalEvents} events scanned
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg">
            <h1 className="text-3xl font-semibold tracking-tight">
              {heroValue
                ? `${username || "You"}, You're Losing ${heroValue} Every Year...`
                : "Set compensation to view costs"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Review your calendar, reassign delegable work, and map roles that
              return your time. Every change updates the numbers instantly.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Annual Arbitrage
            </p>
            <p className="mt-3 text-2xl font-semibold">
              {heroValue ?? "Set compensation"}
            </p>
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
            <p className="mt-3 text-2xl font-semibold">
              {metrics.efficiencyScore}%
            </p>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Tier Breakdown</h2>
              <p className="text-sm text-muted-foreground">
                Hours by delegation tier, adjusted for overlaps.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Total hours: {formatHours(totalHours)}
            </div>
          </div>

          <div className="mt-6 flex h-4 w-full overflow-hidden rounded-full bg-muted">
            {tierBreakdown.map((tier) => {
              const percentage =
                totalHours > 0 ? (tier.hours / totalHours) * 100 : 0;
              return (
                <div
                  key={tier.key}
                  className={`${tier.color}`}
                  style={{ width: `${percentage}%` }}
                />
              );
            })}
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Event Table</h2>
              <p className="text-sm text-muted-foreground">
                Reconciled {reconciledCount} of {totalEvents}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Sort by:
              <button
                className="rounded-full border border-border px-3 py-1"
                onClick={() => toggleSort("date")}
              >
                Date
              </button>
              <button
                className="rounded-full border border-border px-3 py-1"
                onClick={() => toggleSort("duration")}
              >
                Duration
              </button>
              <button
                className="rounded-full border border-border px-3 py-1"
                onClick={() => toggleSort("tier")}
              >
                Tier
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-3 pr-4">Title</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3 pr-4">Tier</th>
                  <th className="py-3">Reconcile</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{event.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(event.startAt)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDuration(event.durationMinutes)}
                    </td>
                    <td className="py-3 pr-4">
                      {event.isLeave ? (
                        <span className="rounded-full border border-border px-2 py-1 text-xs">
                          Leave
                        </span>
                      ) : (
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          value={event.finalTier || "SENIOR"}
                          onChange={(value) =>
                            handleTierChange(event.id, value.target.value)
                          }
                        >
                          {tierOptions.map((tier) => (
                            <option key={tier} value={tier}>
                              {TIER_LABELS[tier] || tier}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3">
                      <Button
                        variant={event.reconciled ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleReconcile(event.id)}
                        disabled={event.reconciled}
                      >
                        <span className="flex items-center gap-2">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            className="size-4"
                          >
                            <path
                              fill="currentColor"
                              d="M7.8 13.4 4.6 10.2l1.4-1.4 1.8 1.8 6-6 1.4 1.4-7.4 7.4z"
                            />
                          </svg>
                          {event.reconciled ? "Reconciled" : "Reconcile"}
                        </span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {teamRows.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">Delegate to Your Team</h2>
              <p className="text-sm text-muted-foreground">
                Existing team members who can take recurring tasks.
              </p>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Team Count</th>
                    <th className="py-3 pr-4">Tasks to Delegate</th>
                    <th className="py-3">Potential Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.label}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.count}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.tasks}
                      </td>
                      <td className="py-3 text-muted-foreground">{row.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold">AI-Powered Automation</h2>
            <p className="text-sm text-muted-foreground">
              Automation ideas to reclaim time without hiring.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">AI SDR</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Automate outreach follow-ups, lead qualification, and meeting prep.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Estimated savings: 6 hrs/week
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">AI Writer</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Draft content briefs, polish messaging, and keep updates consistent.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Estimated savings: 4 hrs/week
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Role Recommendations</h2>
              <p className="text-sm text-muted-foreground">
                Build the roles that take the most time off your plate.
              </p>
            </div>
            {showRoleDrag && (
              <div className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                Drag cards or tasks to rebalance roles
              </div>
            )}
          </div>

          {roles.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Not enough delegable hours yet. Add more events or expand the date
              range to generate role recommendations.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {roles.map((role) => {
                const expanded = expandedRoles.has(role.id);
                return (
                  <div
                    key={role.id}
                    className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                    onDragOver={(event) => {
                      if (showRoleDrag) event.preventDefault();
                    }}
                    onDrop={() => {
                      if (showRoleDrag) handleRoleDrop(role.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {showRoleDrag && (
                            <button
                              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                              draggable
                              onDragStart={() => setDragRoleId(role.id)}
                            >
                              |||
                            </button>
                          )}
                          <h3 className="text-lg font-semibold">{role.roleTitle}</h3>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {role.hoursPerWeek} hrs/week ·{" "}
                          {formatCurrency(role.costMonthly) || "$0"}/month
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyJobDescription(role.id)}
                        >
                          {copiedRole === role.id ? "Copied" : "Copy JD"}
                        </Button>
                        <button
                          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                          onClick={() => toggleRole(role.id)}
                        >
                          {expanded ? "Hide JD" : "View JD"}
                        </button>
                      </div>
                    </div>

                    <div
                      className="mt-4 space-y-2"
                      onDragOver={(event) => {
                        if (showRoleDrag) {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                      onDrop={(event) => {
                        if (showRoleDrag) {
                          event.preventDefault();
                          event.stopPropagation();
                          handleTaskDrop(role.id);
                        }
                      }}
                    >
                      {role.tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Add tasks to refine this role.
                        </p>
                      ) : (
                        role.tasks.map((task, index) => (
                          <div
                            key={`${role.id}-${index}`}
                            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                            draggable={showRoleDrag}
                            onDragStart={() =>
                              setDraggedTask({ roleId: role.id, taskIndex: index })
                            }
                          >
                            <span className="font-medium">{task.task}</span>
                            <span className="text-muted-foreground">
                              {formatHours(task.hoursPerWeek)} hrs/week
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {expanded && (
                      <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
                        {role.jdText}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-semibold">Unlock the full report</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to export, share, and save role plans for your team.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Upgrade</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

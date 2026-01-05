"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const TIER_COLORS: Record<string, string> = {
  UNIQUE: "bg-purple-500",
  FOUNDER: "bg-blue-500",
  SENIOR: "bg-emerald-500",
  JUNIOR: "bg-amber-400",
  EA: "bg-slate-400",
  UNCLASSIFIED: "bg-slate-300",
};

type DashboardAction = {
  id: string;
  title: string;
  description: string;
  impact: string;
  href: string;
};

type WeekEvent = {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  finalTier: string;
};

type RecentAudit = {
  id: string;
  status: string | null;
  dateLabel: string;
  efficiencyScore: number;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string | null;
};

type ComparisonData = {
  current: {
    efficiencyScore: number;
    planningScore: number;
    arbitrage: number | null;
    hoursByTier: Record<string, number>;
  };
  previous: {
    efficiencyScore: number;
    planningScore: number;
    arbitrage: number | null;
    hoursByTier: Record<string, number>;
  } | null;
};

type ScheduleData = {
  id: string;
  frequency: string;
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  nextRunAt: string | null;
};

type DashboardClientProps = {
  hasSubscription: boolean;
  latestAuditId: string;
  efficiencyScore: number;
  efficiencyDelta: number | null;
  planningScore: number;
  reclaimableHoursMonthly: number;
  monthlySavings: number | null;
  actions: DashboardAction[];
  weekEvents: WeekEvent[];
  recentAudits: RecentAudit[];
  comparison: ComparisonData;
  notifications: NotificationItem[];
  unreadCount: number;
  schedule: ScheduleData | null;
  showSubscribeBanner: boolean;
};

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

function formatWeekday(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDelta(value: number | null, suffix = "%") {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardClient({
  hasSubscription,
  latestAuditId,
  efficiencyScore,
  efficiencyDelta,
  planningScore,
  reclaimableHoursMonthly,
  monthlySavings,
  actions,
  weekEvents,
  recentAudits,
  comparison,
  notifications: initialNotifications,
  unreadCount: initialUnread,
  schedule,
  showSubscribeBanner,
}: DashboardClientProps) {
  const [comparisonRange, setComparisonRange] = useState("week");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scheduleState, setScheduleState] = useState<ScheduleData>(() =>
    schedule || {
      id: "",
      frequency: "weekly",
      enabled: false,
      dayOfWeek: 6,
      hour: 3,
      nextRunAt: null,
    }
  );
  const [savingSchedule, setSavingSchedule] = useState(false);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const eventsByDay = useMemo(() => {
    const buckets: WeekEvent[][] = Array.from({ length: 7 }, () => []);
    for (const event of weekEvents) {
      if (!event.startAt) continue;
      const date = new Date(event.startAt);
      const dayIndex = Math.floor(
        (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < 7) {
        buckets[dayIndex].push(event);
      }
    }
    return buckets;
  }, [weekEvents, weekStart]);

  const comparisonDelta = comparison.previous
    ? {
        efficiency: comparison.current.efficiencyScore - comparison.previous.efficiencyScore,
        planning: comparison.current.planningScore - comparison.previous.planningScore,
        arbitrage:
          comparison.current.arbitrage !== null && comparison.previous.arbitrage !== null
            ? comparison.current.arbitrage - comparison.previous.arbitrage
            : null,
      }
    : null;

  async function markNotificationRead(id?: string) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { notificationId: id } : { all: true }),
    });

    if (id) {
      setNotifications((prev) =>
        prev.map((notice) =>
          notice.id === id ? { ...notice, readAt: notice.readAt || new Date().toISOString() } : notice
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } else {
      setNotifications((prev) =>
        prev.map((notice) => ({ ...notice, readAt: notice.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  }

  async function saveSchedule(nextSchedule: ScheduleData) {
    setSavingSchedule(true);
    const response = await fetch("/api/scheduled-audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSchedule),
    });

    const data = (await response.json().catch(() => null)) as
      | { schedule?: ScheduleData; error?: string }
      | null;

    if (response.ok && data?.schedule) {
      setScheduleState(data.schedule);
    }

    setSavingSchedule(false);
  }

  function handleScheduleUpdate(partial: Partial<ScheduleData>) {
    const next = { ...scheduleState, ...partial };
    setScheduleState(next);
    void saveSchedule(next);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Dashboard
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Your founder leverage snapshot</h1>
          </div>
          <div className="relative">
            <button
              type="button"
              className="relative flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <span>🔔</span>
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-background p-4 text-xs shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Notifications</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => markNotificationRead()}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {notifications.length === 0 && (
                    <p className="text-muted-foreground">No notifications yet.</p>
                  )}
                  {notifications.map((notice) => (
                    <div
                      key={notice.id}
                      className={`rounded-xl border border-border p-3 ${
                        notice.readAt ? "bg-muted/20" : "bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{notice.title}</p>
                          <p className="mt-1 text-muted-foreground">{notice.body}</p>
                          {notice.link && (
                            <Link href={notice.link} className="mt-2 inline-block text-blue-500">
                              Open
                            </Link>
                          )}
                        </div>
                        {!notice.readAt && (
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground"
                            onClick={() => markNotificationRead(notice.id)}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {showSubscribeBanner && (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Unlock automated audits and AI planning</h2>
                <p className="text-sm text-muted-foreground">
                  Upgrade to schedule recurring audits and get proactive notifications.
                </p>
              </div>
              <Button asChild>
                <Link href="/">View plans</Link>
              </Button>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Efficiency Score
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-4xl font-semibold">{efficiencyScore}%</span>
              {efficiencyDelta !== null && (
                <div
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    efficiencyDelta >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  <span>{efficiencyDelta >= 0 ? "↑" : "↓"}</span>
                  <span>{formatDelta(efficiencyDelta)}</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Compared to last audit period.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Planning Score
              </p>
              <p className="mt-2 text-2xl font-semibold">{planningScore}%</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Hours Reclaimed
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {reclaimableHoursMonthly} hrs/month
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Saved Monthly
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {monthlySavings === null ? "Set compensation" : formatCurrency(monthlySavings)}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Top actions</h2>
            <p className="text-sm text-muted-foreground">
              Focus on the highest-leverage fixes this week.
            </p>
            <div className="mt-4 space-y-3">
              {actions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Great work! No critical actions right now.
                </p>
              )}
              {actions.map((action) => (
                <Link
                  key={action.id}
                  href={action.href}
                  className="block rounded-2xl border border-border bg-background p-4 text-sm hover:border-primary"
                >
                  <p className="font-semibold">{action.title}</p>
                  <p className="mt-1 text-muted-foreground">{action.description}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    {action.impact}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/planning"
            className="rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">This week</h2>
                <p className="text-sm text-muted-foreground">
                  Preview your upcoming calendar load.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Open Planning →</span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2 text-[10px] text-muted-foreground">
              {weekDays.map((day, index) => (
                <div key={day.toISOString()} className="space-y-2">
                  <div className="font-semibold">{formatWeekday(day)}</div>
                  <div className="space-y-1">
                    {(eventsByDay[index] || []).slice(0, 3).map((event) => {
                      const tier = event.finalTier.toUpperCase();
                      const color = TIER_COLORS[tier] || TIER_COLORS.SENIOR;
                      return (
                        <div
                          key={event.id}
                          className={`h-2 rounded-full ${color}`}
                          title={event.title}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Comparison view</h2>
                <p className="text-sm text-muted-foreground">
                  Track changes between your most recent audits.
                </p>
              </div>
              <select
                value={comparisonRange}
                onChange={(event) => setComparisonRange(event.target.value)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs"
              >
                <option value="week">This week vs last week</option>
                <option value="month">This month vs last month</option>
                <option value="quarter">This quarter vs last quarter</option>
              </select>
            </div>

            {comparison.previous ? (
              <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Efficiency
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {comparison.current.efficiencyScore}% → {comparison.previous.efficiencyScore}%
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      (comparisonDelta?.efficiency || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }`}
                  >
                    {formatDelta(comparisonDelta?.efficiency || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Planning
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {comparison.current.planningScore}% → {comparison.previous.planningScore}%
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      (comparisonDelta?.planning || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }`}
                  >
                    {formatDelta(comparisonDelta?.planning || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Annual Arbitrage
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {comparison.current.arbitrage === null
                      ? "Private"
                      : formatCurrency(comparison.current.arbitrage)}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      (comparisonDelta?.arbitrage || 0) >= 0
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }`}
                  >
                    {comparisonDelta?.arbitrage !== null
                      ? formatCurrency(comparisonDelta?.arbitrage || 0)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Delegable Hours
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {Math.round(
                      (comparison.current.hoursByTier.senior || 0) +
                        (comparison.current.hoursByTier.junior || 0) +
                        (comparison.current.hoursByTier.ea || 0)
                    )}h → {Math.round(
                      (comparison.previous.hoursByTier.senior || 0) +
                        (comparison.previous.hoursByTier.junior || 0) +
                        (comparison.previous.hoursByTier.ea || 0)
                    )}h
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Run a second audit to unlock comparisons.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Automation</h2>
            <p className="text-sm text-muted-foreground">
              Schedule recurring audits to keep your metrics fresh.
            </p>
            {!hasSubscription && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                Upgrade to enable automated audits and notifications.
              </div>
            )}
            <div className="mt-4 space-y-4 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Enable automation</span>
                <input
                  type="checkbox"
                  checked={scheduleState.enabled}
                  disabled={!hasSubscription || savingSchedule}
                  onChange={(event) =>
                    handleScheduleUpdate({ enabled: event.target.checked })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Frequency</span>
                <select
                  value={scheduleState.frequency}
                  disabled={!hasSubscription || savingSchedule}
                  onChange={(event) =>
                    handleScheduleUpdate({ frequency: event.target.value })
                  }
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next run</span>
                <span className="text-xs">
                  {scheduleState.nextRunAt ? formatDate(scheduleState.nextRunAt) : "Not scheduled"}
                </span>
              </div>
              {savingSchedule && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/processing">Run new audit</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/planning">Open planning</Link>
              </Button>
              <Button asChild>
                <Link href={`/results/${latestAuditId}`}>View recommendations</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent audits</h2>
          <div className="mt-4 space-y-3 text-sm">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{audit.dateLabel}</p>
                  <p className="text-xs text-muted-foreground">Status: {audit.status}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{audit.efficiencyScore}%</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/results/${audit.id}`}>View</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

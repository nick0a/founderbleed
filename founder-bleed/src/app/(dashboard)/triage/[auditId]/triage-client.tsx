"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type TriageEvent = {
  id: string;
  title: string;
  startAt: string | null;
  durationMinutes: number;
  suggestedTier: string | null;
  finalTier: string | null;
  reconciled: boolean;
  isLeave: boolean;
  leaveConfidence: string | null;
  leaveDetectionMethod: string | null;
};

type TriageClientProps = {
  auditId: string;
  events: TriageEvent[];
  isSoloFounder: boolean;
};

type SortKey =
  | "title"
  | "date"
  | "duration"
  | "suggested"
  | "final"
  | "reconciled";

const TIER_LABELS: Record<string, string> = {
  UNIQUE: "Unique",
  FOUNDER: "Founder",
  SENIOR: "Senior",
  JUNIOR: "Junior",
  EA: "EA",
  UNCLASSIFIED: "Unclassified",
};

const LOCAL_STORAGE_KEY = "founderbleed:triage-explained";

function normalizeTier(value: string | null | undefined) {
  if (!value) return "SENIOR";
  const upper = value.toUpperCase();
  return TIER_LABELS[upper] ? upper : "SENIOR";
}

function formatTierLabel(value: string | null | undefined) {
  const normalized = normalizeTier(value);
  return TIER_LABELS[normalized] || normalized;
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

export default function TriageClient({
  auditId,
  events: initialEvents,
  isSoloFounder,
}: TriageClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<TriageEvent[]>(initialEvents);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LOCAL_STORAGE_KEY) !== "true";
  });

  const tierOptions = isSoloFounder
    ? ["UNIQUE", "SENIOR", "JUNIOR", "EA"]
    : ["UNIQUE", "FOUNDER", "SENIOR", "JUNIOR", "EA"];

  const activeEvents = events.filter((event) => !event.isLeave);
  const leaveEvents = events.filter((event) => event.isLeave);

  const reconciledCount = activeEvents.filter((event) => event.reconciled).length;
  const reviewTotal = activeEvents.length;
  const progress = reviewTotal > 0 ? Math.round((reconciledCount / reviewTotal) * 100) : 0;

  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event) => !event.isLeave);

    if (filterTier !== "all") {
      filtered = filtered.filter((event) => normalizeTier(event.finalTier || event.suggestedTier) === filterTier);
    }

    if (filterStatus === "reconciled") {
      filtered = filtered.filter((event) => event.reconciled);
    } else if (filterStatus === "pending") {
      filtered = filtered.filter((event) => !event.reconciled);
    }

    const direction = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * direction;
      }
      if (sortKey === "duration") {
        return (a.durationMinutes - b.durationMinutes) * direction;
      }
      if (sortKey === "suggested") {
        return normalizeTier(a.suggestedTier).localeCompare(normalizeTier(b.suggestedTier)) * direction;
      }
      if (sortKey === "final") {
        return normalizeTier(a.finalTier).localeCompare(normalizeTier(b.finalTier)) * direction;
      }
      if (sortKey === "reconciled") {
        return (Number(a.reconciled) - Number(b.reconciled)) * direction;
      }
      const timeA = a.startAt ? new Date(a.startAt).getTime() : 0;
      const timeB = b.startAt ? new Date(b.startAt).getTime() : 0;
      return (timeA - timeB) * direction;
    });

    return filtered;
  }, [events, filterTier, filterStatus, sortDir, sortKey]);

  async function persistEventUpdate(eventId: string, payload: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir("asc");
  }

  async function handleTierChange(eventId: string, value: string) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, finalTier: value } : event
      )
    );
    try {
      await persistEventUpdate(eventId, { finalTier: value });
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

  async function handleOverride(eventId: string, suggestedTier: string | null) {
    const nextTier = normalizeTier(suggestedTier);
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? { ...event, isLeave: false, finalTier: nextTier }
          : event
      )
    );
    try {
      await persistEventUpdate(eventId, { isLeave: false, finalTier: nextTier });
    } catch (error) {
      console.error("Failed to override leave event", error);
    }
  }

  function dismissModal(remember: boolean) {
    if (remember) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    }
    setShowModal(false);
  }

  function handleComplete() {
    router.push(`/results/${auditId}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Review Classifications
              </p>
              <h1 className="mt-3 text-2xl font-semibold">Triage your events</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirm the suggested tier for each event.
              </p>
            </div>
            <Button onClick={handleComplete} disabled={reconciledCount !== reviewTotal}>
              Complete review
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {reconciledCount} of {reviewTotal} events reviewed
              </span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Active events</h2>
              <p className="text-sm text-muted-foreground">
                Filter and confirm tiers below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select
                value={filterTier}
                onChange={(event) => setFilterTier(event.target.value)}
                className="rounded-full border border-border bg-background px-3 py-1"
              >
                <option value="all">All tiers</option>
                {tierOptions.map((tier) => (
                  <option key={tier} value={tier}>
                    {TIER_LABELS[tier]}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="rounded-full border border-border bg-background px-3 py-1"
              >
                <option value="all">All statuses</option>
                <option value="reconciled">Reconciled</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-3 pr-4">
                    <button onClick={() => toggleSort("title")}>Title</button>
                  </th>
                  <th className="py-3 pr-4">
                    <button onClick={() => toggleSort("date")}>Date</button>
                  </th>
                  <th className="py-3 pr-4">
                    <button onClick={() => toggleSort("duration")}>Duration</button>
                  </th>
                  <th className="py-3 pr-4">
                    <button onClick={() => toggleSort("suggested")}>Suggested</button>
                  </th>
                  <th className="py-3 pr-4">
                    <button onClick={() => toggleSort("final")}>Your Tier</button>
                  </th>
                  <th className="py-3">
                    <button onClick={() => toggleSort("reconciled")}>Reconcile</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{event.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(event.startAt)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDuration(event.durationMinutes)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatTierLabel(event.suggestedTier)}
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={normalizeTier(event.finalTier || event.suggestedTier)}
                        onChange={(value) =>
                          handleTierChange(event.id, value.target.value)
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        {tierOptions.map((tier) => (
                          <option key={tier} value={tier}>
                            {TIER_LABELS[tier]}
                          </option>
                        ))}
                      </select>
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

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Leave events</h2>
          <p className="text-sm text-muted-foreground">
            These events are excluded from metrics. Override if needed.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm opacity-70">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="py-3 pr-4">Title</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3 pr-4">Confidence</th>
                  <th className="py-3">Override</th>
                </tr>
              </thead>
              <tbody>
                {leaveEvents.length === 0 && (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>
                      No leave events detected.
                    </td>
                  </tr>
                )}
                {leaveEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{event.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(event.startAt)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDuration(event.durationMinutes)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {event.leaveConfidence || "low"}
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOverride(event.id, event.suggestedTier)}
                      >
                        Override
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-xl font-semibold">How we categorize your time</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We classify each calendar event by asking: &quot;Who should do this work?&quot;
            </p>
            <div className="mt-4 rounded-2xl border border-border p-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span>Only I can do this</span>
                  <span className="font-semibold">Unique</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span>A co-founder could do it</span>
                  <span className="font-semibold">Founder</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span>A senior specialist</span>
                  <span className="font-semibold">Senior</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span>A junior team member</span>
                  <span className="font-semibold">Junior</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>An assistant could do it</span>
                  <span className="font-semibold">EA</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="outline" onClick={() => dismissModal(false)}>
                Got it, let&apos;s review
              </Button>
              <Button onClick={() => dismissModal(true)}>Don&apos;t show again</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

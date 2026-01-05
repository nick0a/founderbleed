"use client";

import { useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_HEIGHT = 56;

const TIER_COLORS: Record<string, string> = {
  UNIQUE: "bg-purple-500/90 text-white",
  FOUNDER: "bg-blue-500/90 text-white",
  SENIOR: "bg-emerald-500/90 text-white",
  JUNIOR: "bg-amber-400/90 text-amber-950",
  EA: "bg-slate-400/90 text-white",
  UNCLASSIFIED: "bg-slate-300/90 text-slate-900",
};

const SCORE_COLORS = {
  high: "bg-emerald-500 text-white",
  mid: "bg-amber-400 text-amber-950",
  low: "bg-rose-500 text-white",
};

type PlanningEvent = {
  id: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number;
  finalTier: string;
  planningScore: number;
  isAllDay: boolean;
};

type SuggestionStatus = "idle" | "adding" | "added" | "error";

type Suggestion = {
  id: string;
  title: string;
  start: string;
  end: string;
  tier?: string;
  status: SuggestionStatus;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

type PlanningClientProps = {
  auditId: string;
  planningScore: number;
  efficiencyScore: number;
  events: PlanningEvent[];
  hasWriteAccess: boolean;
  initialFocusDate: string;
  isSoloFounder: boolean;
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

function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(start: Date, end: Date) {
  const startLabel = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endLabel = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatHourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
  });
}

function scoreBadge(score: number) {
  if (score >= 70) return SCORE_COLORS.high;
  if (score >= 40) return SCORE_COLORS.mid;
  return SCORE_COLORS.low;
}

function buildSuggestionId(index: number) {
  return `suggestion-${Date.now()}-${index}`;
}

export default function PlanningClient({
  auditId,
  planningScore,
  efficiencyScore,
  events,
  hasWriteAccess,
  initialFocusDate,
  isSoloFounder,
}: PlanningClientProps) {
  const [focusDate, setFocusDate] = useState(() => new Date(initialFocusDate));
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      role: "assistant",
      content: `Your planning score is ${planningScore}% and efficiency score is ${efficiencyScore}%. What are your top priorities this week?`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const delegableTasks = useMemo(() => {
    const output: string[] = [];
    const seen = new Set<string>();
    for (const event of events) {
      const tier = event.finalTier.toUpperCase();
      if (!["SENIOR", "JUNIOR", "EA"].includes(tier)) continue;
      const title = event.title.trim();
      if (!title || seen.has(title)) continue;
      seen.add(title);
      output.push(title);
      if (output.length >= 4) break;
    }
    return output;
  }, [events]);

  const weekEvents = useMemo(() => {
    const start = weekStart.getTime();
    const end = addDays(weekStart, 7).getTime();
    return events.filter((event) => {
      if (!event.startAt) return false;
      const eventTime = new Date(event.startAt).getTime();
      return eventTime >= start && eventTime < end;
    });
  }, [events, weekStart]);

  const eventsByDay = useMemo(() => {
    const buckets: PlanningEvent[][] = Array.from({ length: 7 }, () => []);
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

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/planning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, auditId }),
      });

      const data = (await response.json().catch(() => null)) as
        | { reply?: string; suggestions?: Array<Record<string, string>> }
        | null;

      if (!response.ok) {
        throw new Error(data?.reply || "Planning request failed");
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }

      if (Array.isArray(data?.suggestions) && data?.suggestions.length > 0) {
        const parsed = data.suggestions
          .filter((suggestion) => suggestion.type === "event_suggestion")
          .map((suggestion, index) => ({
            id: buildSuggestionId(index),
            title: suggestion.title,
            start: suggestion.start,
            end: suggestion.end,
            tier: suggestion.tier,
            status: "idle" as SuggestionStatus,
          }));

        setSuggestions((prev) => [...prev, ...parsed]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I ran into an issue generating that plan. Please try again.",
        },
      ]);
    } finally {
      setIsThinking(false);
      scrollToBottom();
    }
  }

  async function addToCalendar(suggestion: Suggestion) {
    if (!hasWriteAccess) {
      setShowWriteModal(true);
      return;
    }

    setSuggestions((prev) =>
      prev.map((item) =>
        item.id === suggestion.id ? { ...item, status: "adding" } : item
      )
    );

    try {
      const response = await fetch("/api/calendar/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          startTime: suggestion.start,
          endTime: suggestion.end,
          description: suggestion.tier
            ? `Tier: ${suggestion.tier}`
            : "Created by Founder Bleed Planning Assistant",
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        if (response.status === 403 && data?.error === "write_access_required") {
          setShowWriteModal(true);
          setSuggestions((prev) =>
            prev.map((item) =>
              item.id === suggestion.id ? { ...item, status: "idle" } : item
            )
          );
          return;
        }
        throw new Error("Failed to create event");
      }

      setSuggestions((prev) =>
        prev.map((item) =>
          item.id === suggestion.id ? { ...item, status: "added" } : item
        )
      );
    } catch {
      setSuggestions((prev) =>
        prev.map((item) =>
          item.id === suggestion.id ? { ...item, status: "error" } : item
        )
      );
    }
  }

  async function addAllSuggestions() {
    const pending = suggestions.filter((suggestion) => suggestion.status === "idle");
    if (pending.length === 0) return;
    if (!hasWriteAccess) {
      setShowWriteModal(true);
      return;
    }

    for (const suggestion of pending) {
      await addToCalendar(suggestion);
    }
  }

  function requestWriteAccess() {
    void signIn(
      "google",
      { callbackUrl: "/planning" },
      {
        prompt: "consent",
        access_type: "offline",
        scope:
          "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
      }
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Planning Assistant
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Design a high-leverage week</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Chat with the assistant and map high-impact time blocks to your calendar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
              Planning Score: <span className="font-semibold text-foreground">{planningScore}%</span>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
              Efficiency: <span className="font-semibold text-foreground">{efficiencyScore}%</span>
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Conversation</h2>
              <p className="text-sm text-muted-foreground">
                Ask for weekly focus blocks, delegation ideas, or meeting clean-up.
              </p>

              {delegableTasks.length > 0 && (
                <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Top delegable tasks
                  </p>
                  <ul className="mt-3 space-y-1 text-muted-foreground">
                    {delegableTasks.map((task) => (
                      <li key={task}>• {task}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 max-h-[420px] space-y-4 overflow-y-auto rounded-2xl border border-border bg-background p-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-foreground">
                      Typing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask the assistant to schedule focus blocks or redesign your week..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSend} disabled={isThinking || !input.trim()}>
                    Send message
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Suggested events</h3>
                  <p className="text-sm text-muted-foreground">
                    Add AI-recommended blocks to your calendar.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={addAllSuggestions}
                  disabled={suggestions.every((item) => item.status !== "idle")}
                >
                  Add all suggestions
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {suggestions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Ask the assistant to generate focus blocks to see suggestions here.
                  </p>
                )}
                {suggestions.map((suggestion) => {
                  const start = new Date(suggestion.start);
                  const end = new Date(suggestion.end);
                  return (
                    <div
                      key={suggestion.id}
                      className="rounded-2xl border border-border bg-background p-4 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">📅 {suggestion.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeRange(start, end)} · {Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)))} hours
                          </p>
                          {suggestion.tier && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Tier: {suggestion.tier}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => addToCalendar(suggestion)}
                            disabled={suggestion.status === "added" || suggestion.status === "adding"}
                          >
                            {suggestion.status === "added"
                              ? "Added"
                              : suggestion.status === "adding"
                                ? "Adding..."
                                : "Add to Calendar"}
                          </Button>
                        </div>
                      </div>
                      {suggestion.status === "error" && (
                        <p className="mt-2 text-xs text-rose-500">
                          Unable to add this event. Try again.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Week view</h2>
                <p className="text-sm text-muted-foreground">
                  {formatWeekRange(weekStart)} · Planning Score {planningScore}%
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setFocusDate(addDays(focusDate, -7))}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFocusDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setFocusDate(addDays(focusDate, 7))}>
                  Next
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[70px_repeat(7,minmax(0,1fr))]">
              <div className="" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-b border-border px-2 pb-2 text-xs font-semibold text-muted-foreground"
                >
                  {formatDayLabel(day)}
                </div>
              ))}

              <div className="flex flex-col border-r border-border text-xs text-muted-foreground">
                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
                  const hour = START_HOUR + index;
                  return (
                    <div
                      key={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className="flex items-start justify-end pr-2 pt-1"
                    >
                      {formatHourLabel(hour)}
                    </div>
                  );
                })}
              </div>

              {eventsByDay.map((dayEvents, dayIndex) => (
                <div
                  key={`day-${dayIndex}`}
                  className="relative border-l border-border"
                  style={{ height: HOUR_HEIGHT * (END_HOUR - START_HOUR + 1) }}
                >
                  {dayEvents
                    .filter((event) => !event.isAllDay && event.startAt && event.endAt)
                    .map((event) => {
                      const start = new Date(event.startAt || "");
                      const end = new Date(event.endAt || "");
                      const startHours = start.getHours() + start.getMinutes() / 60;
                      const endHours = end.getHours() + end.getMinutes() / 60;
                      const top = Math.max(0, (startHours - START_HOUR) * HOUR_HEIGHT);
                      const height = Math.max(24, (endHours - startHours) * HOUR_HEIGHT);
                      const tierKey = event.finalTier?.toUpperCase() || "SENIOR";
                      const tierColor = TIER_COLORS[tierKey] || TIER_COLORS.SENIOR;
                      return (
                        <div
                          key={event.id}
                          className={`absolute left-2 right-2 rounded-xl px-3 py-2 text-xs shadow-sm ${tierColor}`}
                          style={{ top, height }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{event.title}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreBadge(
                                event.planningScore
                              )}`}
                            >
                              {Math.round(event.planningScore)}%
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] opacity-90">
                            {formatTimeRange(start, end)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-xs">
              <p className="font-semibold text-muted-foreground">Tier legend</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <LegendItem label="Unique" color={TIER_COLORS.UNIQUE} />
                {!isSoloFounder && <LegendItem label="Founder" color={TIER_COLORS.FOUNDER} />}
                <LegendItem label="Senior" color={TIER_COLORS.SENIOR} />
                <LegendItem label="Junior" color={TIER_COLORS.JUNIOR} />
                <LegendItem label="EA" color={TIER_COLORS.EA} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Add Events to Your Calendar
            </p>
            <h2 className="mt-3 text-2xl font-semibold">Grant write access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              To add events directly, we need permission to create new calendar entries.
              We never edit or delete existing events.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>✓ Create new focus blocks from your plan</li>
              <li>✓ Protect deep work time on your calendar</li>
              <li>✓ Keep all edits transparent and optional</li>
            </ul>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowWriteModal(false)}>
                Cancel
              </Button>
              <Button onClick={requestWriteAccess}>Grant Access</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LegendItem({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-3 w-3 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

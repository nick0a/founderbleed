import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditRuns, events } from "@/lib/db/schema";
import { decrypt } from "@/lib/encryption";
import { requireSubscription } from "@/lib/subscription";

type ChatPayload = {
  message?: string;
  auditId?: string;
};

function safeDecrypt(value: string | null) {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    return "";
  }
}

function getNextBusinessDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function parseHourRequest(message: string) {
  const match = message.match(/(\d+)\s*hour/i);
  if (!match) return 2;
  const hours = Number(match[1]);
  return Number.isFinite(hours) && hours > 0 ? Math.min(hours, 6) : 2;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await requireSubscription(session.user.id, "starter");
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as ChatPayload | null;
  if (!payload?.message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const audit = payload.auditId
    ? await db.query.auditRuns.findFirst({
        where: eq(auditRuns.id, payload.auditId),
      })
    : await db.query.auditRuns.findFirst({
        where: eq(auditRuns.userId, session.user.id),
        orderBy: [desc(auditRuns.createdAt)],
      });

  if (!audit) {
    return NextResponse.json({ error: "audit not found" }, { status: 404 });
  }

  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, audit.id),
  });

  const hoursByTier = auditEvents.reduce(
    (acc, event) => {
      const tier = (event.finalTier || "SENIOR").toUpperCase();
      const hours = (event.durationMinutes || 0) / 60;
      if (tier === "UNIQUE") acc.unique += hours;
      else if (tier === "FOUNDER") acc.founder += hours;
      else if (tier === "JUNIOR") acc.junior += hours;
      else if (tier === "EA") acc.ea += hours;
      else acc.senior += hours;
      return acc;
    },
    { unique: 0, founder: 0, senior: 0, junior: 0, ea: 0 }
  );

  const efficiencyScore = Math.round(
    ((hoursByTier.unique + hoursByTier.founder) /
      Math.max(
        1,
        hoursByTier.unique +
          hoursByTier.founder +
          hoursByTier.senior +
          hoursByTier.junior +
          hoursByTier.ea
      )) *
      100
  );

  const planningScore = Math.round(Number(audit.planningScore || 0));

  const delegableTasks = auditEvents
    .filter((event) => ["SENIOR", "JUNIOR", "EA"].includes((event.finalTier || "SENIOR").toUpperCase()))
    .map((event) => safeDecrypt(event.title))
    .filter((title) => title.trim().length > 0)
    .slice(0, 5);

  const reply = [
    `Based on your audit, your efficiency score is ${efficiencyScore}% and your planning score is ${planningScore}%.`,
    `Hours by tier: Unique ${Math.round(hoursByTier.unique)}h, Founder ${Math.round(
      hoursByTier.founder
    )}h, Senior ${Math.round(hoursByTier.senior)}h, Junior ${Math.round(
      hoursByTier.junior
    )}h, EA ${Math.round(hoursByTier.ea)}h.`,
    delegableTasks.length > 0
      ? `Top delegable tasks: ${delegableTasks.join(", ")}.`
      : "You are already protecting high-leverage time well.",
  ].join("\n\n");

  const messageText = payload.message.toLowerCase();
  const suggestions = [];

  if (messageText.includes("schedule") || messageText.includes("focus") || messageText.includes("plan")) {
    const hours = parseHourRequest(payload.message);
    const startDate = getNextBusinessDay(new Date());
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + hours);

    suggestions.push({
      type: "event_suggestion",
      title: "Focus: Strategic Planning",
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      tier: "unique",
    });
  }

  return NextResponse.json({ reply, suggestions });
}

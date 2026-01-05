import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduledAudits, users } from "@/lib/db/schema";
import { calculateNextRunAt, type AuditFrequency } from "@/lib/audit-schedule";
import { getActiveSubscription } from "@/lib/subscription";

type SchedulePayload = {
  frequency?: AuditFrequency;
  enabled?: boolean;
  dayOfWeek?: number;
  hour?: number;
};

function normalizeFrequency(value: string | undefined): AuditFrequency {
  if (value === "monthly") return "monthly";
  if (value === "annual") return "annual";
  return "weekly";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existing = await db.query.scheduledAudits.findFirst({
    where: eq(scheduledAudits.userId, session.user.id),
  });

  if (existing) {
    return NextResponse.json({ schedule: existing });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  const frequency: AuditFrequency = "weekly";
  const dayOfWeek = 6;
  const hour = 3;
  const nextRunAt = calculateNextRunAt({ frequency, dayOfWeek, hour });

  const [created] = await db
    .insert(scheduledAudits)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      frequency,
      dayOfWeek,
      hour,
      timezone: user?.timezone || "UTC",
      enabled: false,
      nextRunAt,
    })
    .returning();

  return NextResponse.json({ schedule: created });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const subscription = await getActiveSubscription(session.user.id);
  if (!subscription) {
    return NextResponse.json(
      { error: "subscription_required" },
      { status: 403 }
    );
  }

  const payload = (await request.json().catch(() => null)) as SchedulePayload | null;
  const frequency = normalizeFrequency(payload?.frequency);
  const dayOfWeek =
    typeof payload?.dayOfWeek === "number" ? payload.dayOfWeek : 6;
  const hour = typeof payload?.hour === "number" ? payload.hour : 3;
  const enabled = Boolean(payload?.enabled);
  const nextRunAt = enabled
    ? calculateNextRunAt({ frequency, dayOfWeek, hour })
    : null;

  const existing = await db.query.scheduledAudits.findFirst({
    where: eq(scheduledAudits.userId, session.user.id),
  });

  if (existing) {
    const [updated] = await db
      .update(scheduledAudits)
      .set({
        frequency,
        dayOfWeek,
        hour,
        enabled,
        nextRunAt,
      })
      .where(eq(scheduledAudits.id, existing.id))
      .returning();

    return NextResponse.json({ schedule: updated });
  }

  const [created] = await db
    .insert(scheduledAudits)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      frequency,
      dayOfWeek,
      hour,
      timezone: "UTC",
      enabled,
      nextRunAt,
    })
    .returning();

  return NextResponse.json({ schedule: created });
}

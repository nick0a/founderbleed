import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { scheduledAudits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireSubscription } from '@/lib/subscription';

// Calculate next run date based on frequency
function calculateNextRunAt(frequency: string, dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const nextRun = new Date();

  if (frequency === 'weekly') {
    // Find next occurrence of dayOfWeek
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    nextRun.setDate(now.getDate() + daysUntil);
    nextRun.setHours(hour, 0, 0, 0);

    // If the time has already passed today (for same day), add a week
    if (daysUntil === 0 && now.getHours() >= hour) {
      nextRun.setDate(nextRun.getDate() + 7);
    }
  } else if (frequency === 'monthly') {
    // First of next month
    nextRun.setMonth(now.getMonth() + 1, 1);
    nextRun.setHours(hour, 0, 0, 0);
  } else if (frequency === 'annual') {
    // January 1st of next year
    nextRun.setFullYear(now.getFullYear() + 1, 0, 1);
    nextRun.setHours(hour, 0, 0, 0);
  }

  return nextRun;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scheduled = await db.query.scheduledAudits.findFirst({
    where: eq(scheduledAudits.userId, session.user.id),
  });

  return NextResponse.json({ scheduledAudit: scheduled });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Check subscription for automated audits
  const gate = await requireSubscription(session.user.id);
  if (!gate.allowed) {
    return NextResponse.json({ error: 'Subscription required for automated audits' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { frequency, dayOfWeek = 6, hour = 3, timezone = 'UTC', enabled = true } = body;

    if (!['weekly', 'monthly', 'annual'].includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const nextRunAt = calculateNextRunAt(frequency, dayOfWeek, hour);

    // Check if user already has a scheduled audit
    const existing = await db.query.scheduledAudits.findFirst({
      where: eq(scheduledAudits.userId, session.user.id),
    });

    let scheduled;
    if (existing) {
      // Update existing
      [scheduled] = await db.update(scheduledAudits)
        .set({
          frequency,
          dayOfWeek,
          hour,
          timezone,
          enabled,
          nextRunAt,
          updatedAt: new Date(),
        })
        .where(eq(scheduledAudits.id, existing.id))
        .returning();
    } else {
      // Create new
      [scheduled] = await db.insert(scheduledAudits).values({
        userId: session.user.id,
        frequency,
        dayOfWeek,
        hour,
        timezone,
        enabled,
        nextRunAt,
      }).returning();
    }

    return NextResponse.json({ scheduledAudit: scheduled });
  } catch (error) {
    console.error('Scheduled audit error:', error);
    return NextResponse.json({ error: 'Failed to save scheduled audit' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await db.delete(scheduledAudits)
    .where(eq(scheduledAudits.userId, session.user.id));

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scheduledAudits, auditRuns, events, users, notifications } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { getEvents } from '@/lib/google-calendar';
import { classifyEvent } from '@/lib/classification';
import { detectLeave } from '@/lib/leave-detection';
import { calculateMetrics } from '@/lib/metrics';
import { calculatePlanningScore, calculateEventPlanningScore } from '@/lib/planning-score';
import { encrypt, decrypt } from '@/lib/encryption';

interface TeamComposition {
  founder?: number;
  senior_engineering?: number;
  senior_business?: number;
  junior_engineering?: number;
  junior_business?: number;
  qa_engineer?: number;
  ea?: number;
}

// Calculate audit date range based on frequency
function getAuditDateRange(frequency: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (frequency === 'weekly') {
    // Previous week (Sun-Sat)
    const dayOfWeek = now.getDay();
    end = new Date(now);
    end.setDate(now.getDate() - dayOfWeek - 1); // Last Saturday
    end.setHours(23, 59, 59, 999);
    start = new Date(end);
    start.setDate(end.getDate() - 6); // Previous Sunday
    start.setHours(0, 0, 0, 0);
  } else if (frequency === 'monthly') {
    // Previous month
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
  } else {
    // Annual - previous year
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// Calculate next run date
function calculateNextRunAt(frequency: string, dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const nextRun = new Date();

  if (frequency === 'weekly') {
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    nextRun.setDate(now.getDate() + daysUntil);
    nextRun.setHours(hour, 0, 0, 0);
  } else if (frequency === 'monthly') {
    nextRun.setMonth(now.getMonth() + 1, 1);
    nextRun.setHours(hour, 0, 0, 0);
  } else {
    nextRun.setFullYear(now.getFullYear() + 1, 0, 1);
    nextRun.setHours(hour, 0, 0, 0);
  }

  return nextRun;
}

// Check if user is on leave during the entire audit period
async function checkUserOnLeave(userId: string, dateStart: Date, dateEnd: Date): Promise<boolean> {
  // Get events in period and check if any non-leave work events exist
  // For simplicity, we'll check if there are any calendar events that aren't leave
  try {
    const rawEvents = await getEvents(userId, ['primary'], dateStart.toISOString(), dateEnd.toISOString());

    // Check if all events are leave events
    const leaveEvents = rawEvents.filter(e => {
      const leaveResult = detectLeave(e.title, e.description, e.isAllDay, e.eventType ?? undefined);
      return leaveResult.isLeave;
    });

    // If all events are leave, or the majority are leave, consider user on leave
    if (rawEvents.length === 0) return false;
    return leaveEvents.length === rawEvents.length;
  } catch {
    return false;
  }
}

// Create notification for user
async function createNotification(userId: string, type: string, title: string, body: string, link?: string) {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    body,
    link,
  });
}

// Run audit for a user
async function runScheduledAuditForUser(userId: string, frequency: string): Promise<string | null> {
  // Get user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) return null;

  const { start: dateStart, end: dateEnd } = getAuditDateRange(frequency);
  const exclusions = (user.settings as { exclusions?: string[] })?.exclusions || ['lunch', 'gym'];

  // Check solo founder
  const teamComp = (user.teamComposition as TeamComposition) || {};
  const isSoloFounder = teamComp.founder === 1 &&
    Object.entries(teamComp).filter(([k, v]) => k !== 'founder' && (v as number) > 0).length === 0;

  // Create audit run
  const [auditRun] = await db.insert(auditRuns).values({
    userId,
    dateStart,
    dateEnd,
    calendarsIncluded: ['primary'],
    exclusionsUsed: exclusions,
    status: 'processing',
    algorithmVersion: '1.7',
    frequency
  }).returning();

  try {
    // Fetch events
    const rawEvents = await getEvents(userId, ['primary'], dateStart.toISOString(), dateEnd.toISOString());

    // Process events
    const processedEvents = [];
    for (const raw of rawEvents) {
      if (!raw.start || !raw.end) continue;

      const isExcluded = exclusions.some((ex: string) =>
        raw.title.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExcluded) continue;

      const leaveResult = detectLeave(raw.title, raw.description, raw.isAllDay, raw.eventType ?? undefined);

      let durationMinutes = 0;
      if (raw.isAllDay) {
        durationMinutes = 8 * 60;
      } else {
        durationMinutes = Math.round(
          (new Date(raw.end).getTime() - new Date(raw.start).getTime()) / (1000 * 60)
        );
      }

      let classification = null;
      if (!leaveResult.isLeave) {
        classification = classifyEvent(raw.title, raw.description, raw.attendees, isSoloFounder);
      }

      const eventPlanningScore = calculateEventPlanningScore({
        title: raw.title,
        description: raw.description,
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay: raw.isAllDay
      });

      processedEvents.push({
        auditRunId: auditRun.id,
        externalEventId: raw.id,
        startAt: new Date(raw.start),
        endAt: new Date(raw.end),
        durationMinutes,
        isAllDay: raw.isAllDay,
        calendarId: raw.calendarId,
        title: encrypt(raw.title),
        description: raw.description ? encrypt(raw.description) : null,
        attendeesCount: raw.attendees,
        hasMeetLink: raw.hasMeetLink,
        isRecurring: raw.isRecurring,
        suggestedTier: classification?.suggestedTier || null,
        finalTier: classification?.suggestedTier || null,
        businessArea: classification?.businessArea || null,
        vertical: classification?.vertical || null,
        confidenceScore: classification?.confidence || null,
        keywordsMatched: classification?.keywordsMatched || [],
        isLeave: leaveResult.isLeave,
        leaveDetectionMethod: leaveResult.method,
        leaveConfidence: leaveResult.confidence,
        planningScore: eventPlanningScore,
        eventCategory: classification?.eventCategory || 'work'
      });
    }

    if (processedEvents.length > 0) {
      await db.insert(events).values(processedEvents);
    }

    const auditDays = Math.ceil(
      (dateEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const metrics = calculateMetrics(
      processedEvents.map(e => ({
        durationMinutes: e.durationMinutes,
        finalTier: e.finalTier || 'senior',
        vertical: e.vertical || 'business',
        isLeave: e.isLeave
      })),
      {
        salaryAnnual: user.salaryAnnual ? Number(user.salaryAnnual) : null,
        equityPercentage: user.equityPercentage ? Number(user.equityPercentage) : null,
        companyValuation: user.companyValuation ? Number(user.companyValuation) : null,
        vestingPeriodYears: user.vestingPeriodYears ? Number(user.vestingPeriodYears) : null,
        seniorEngineeringRate: Number(user.seniorEngineeringRate) || 100000,
        seniorBusinessRate: Number(user.seniorBusinessRate) || 80000,
        juniorEngineeringRate: Number(user.juniorEngineeringRate) || 40000,
        juniorBusinessRate: Number(user.juniorBusinessRate) || 50000,
        eaRate: Number(user.eaRate) || 25000
      },
      auditDays
    );

    const planningResult = calculatePlanningScore(
      processedEvents.map(e => ({
        title: decrypt(e.title),
        description: e.description ? decrypt(e.description) : '',
        durationMinutes: e.durationMinutes,
        isRecurring: e.isRecurring,
        isAllDay: e.isAllDay
      })),
      auditDays
    );

    await db.update(auditRuns)
      .set({
        status: 'completed',
        computedMetrics: metrics,
        planningScore: planningResult.score,
        planningAssessment: planningResult.assessment,
        leaveDaysDetected: processedEvents.filter(e => e.isLeave).length,
        leaveHoursExcluded: String(processedEvents.filter(e => e.isLeave).reduce((sum, e) => sum + e.durationMinutes / 60, 0))
      })
      .where(eq(auditRuns.id, auditRun.id));

    return auditRun.id;

  } catch (error) {
    console.error('Scheduled audit failed:', error);
    await db.update(auditRuns)
      .set({ status: 'failed' })
      .where(eq(auditRuns.id, auditRun.id));
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Find due audits
    const dueAudits = await db.query.scheduledAudits.findMany({
      where: and(
        eq(scheduledAudits.enabled, true),
        lte(scheduledAudits.nextRunAt, now)
      )
    });

    for (const scheduled of dueAudits) {
      if (!scheduled.userId || !scheduled.frequency) continue;

      const { start: dateStart, end: dateEnd } = getAuditDateRange(scheduled.frequency);

      // Check for leave
      const hasLeave = await checkUserOnLeave(scheduled.userId, dateStart, dateEnd);

      if (hasLeave) {
        // Skip and notify
        await createNotification(
          scheduled.userId,
          'audit_skipped',
          'Audit skipped - you\'re on leave',
          `Your ${scheduled.frequency} audit was skipped because you were on leave during the period.`
        );
        skipped++;
      } else {
        // Run audit
        const auditId = await runScheduledAuditForUser(scheduled.userId, scheduled.frequency);

        if (auditId) {
          // Send notification
          await createNotification(
            scheduled.userId,
            'audit_ready',
            'Your audit is ready',
            `Your ${scheduled.frequency} calendar audit has been completed.`,
            `/results/${auditId}`
          );
          processed++;
        } else {
          failed++;
        }
      }

      // Update next run
      await db.update(scheduledAudits)
        .set({
          lastRunAt: now,
          nextRunAt: calculateNextRunAt(
            scheduled.frequency,
            scheduled.dayOfWeek || 6,
            scheduled.hour || 3
          ),
          updatedAt: now
        })
        .where(eq(scheduledAudits.id, scheduled.id));
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      failed,
      total: dueAudits.length
    });

  } catch (error) {
    console.error('Cron run-audits error:', error);
    return NextResponse.json({ error: 'Cron job failed', details: String(error) }, { status: 500 });
  }
}

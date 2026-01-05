import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audits, events, users } from '@/lib/db/schema';
import { getEvents } from '@/lib/google-calendar';
import { classifyEvent, isSoloFounder as checkIsSoloFounder } from '@/lib/classification';
import { detectLeave } from '@/lib/leave-detection';
import { calculateMetrics } from '@/lib/metrics';
import {
  calculatePlanningScore,
  calculateEventPlanningScore,
} from '@/lib/planning-score';
import { encrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { dateStart, dateEnd, calendarIds, exclusions } = body;

  if (!dateStart || !dateEnd) {
    return NextResponse.json(
      { error: 'dateStart and dateEnd are required' },
      { status: 400 }
    );
  }

  // Get user data
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userResult[0];

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check solo founder status
  const teamComposition = user.teamComposition as Record<string, number> | null;
  const isSoloFounder = checkIsSoloFounder(teamComposition);

  // Default exclusions from user settings or fallback
  const userSettings = user.settings as { exclusions?: string[] } | null;
  const defaultExclusions = userSettings?.exclusions || ['lunch', 'gym'];
  const activeExclusions = exclusions ?? defaultExclusions;

  // Create audit run
  const [auditRun] = await db
    .insert(audits)
    .values({
      userId: session.user.id,
      dateStart: new Date(dateStart),
      dateEnd: new Date(dateEnd),
      calendarsIncluded: calendarIds || ['primary'],
      exclusionsUsed: activeExclusions,
      status: 'processing',
      algorithmVersion: '1.7',
    })
    .returning();

  try {
    // Fetch events from Google Calendar
    const rawEvents = await getEvents(
      session.user.id,
      calendarIds || ['primary'],
      dateStart,
      dateEnd
    );

    // Process events
    const processedEvents: Array<{
      auditId: string;
      externalEventId: string;
      startAt: Date;
      endAt: Date;
      durationMinutes: number;
      isAllDay: boolean;
      calendarId: string;
      title: string;
      description: string | null;
      attendeesCount: number;
      hasMeetLink: boolean;
      isRecurring: boolean;
      suggestedTier: string | null;
      finalTier: string | null;
      businessArea: string | null;
      vertical: string | null;
      confidenceScore: string | null;
      keywordsMatched: string[];
      isLeave: boolean;
      leaveDetectionMethod: string;
      leaveConfidence: string;
      planningScore: number;
    }> = [];

    for (const raw of rawEvents) {
      // Check exclusions (case-insensitive)
      const isExcluded = activeExclusions.some((ex: string) =>
        raw.title.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExcluded) continue;

      // Detect leave
      const leaveResult = detectLeave(
        raw.title,
        raw.description,
        raw.isAllDay,
        raw.eventType
      );

      // Calculate duration
      let durationMinutes = 0;
      if (raw.isAllDay) {
        durationMinutes = 8 * 60; // 8 hours default for all-day events
      } else {
        durationMinutes = Math.round(
          (new Date(raw.end).getTime() - new Date(raw.start).getTime()) /
            (1000 * 60)
        );
      }

      // Classify (only if not leave)
      let classification = null;
      if (!leaveResult.isLeave) {
        classification = classifyEvent(
          raw.title,
          raw.description,
          raw.attendees,
          isSoloFounder
        );
      }

      // Calculate per-event planning score
      const eventPlanningScore = calculateEventPlanningScore({
        title: raw.title,
        description: raw.description,
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay: raw.isAllDay,
      });

      processedEvents.push({
        auditId: auditRun.id,
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
        finalTier: classification?.suggestedTier || null, // Start with suggested
        businessArea: classification?.businessArea || null,
        vertical: classification?.vertical || null,
        confidenceScore: classification?.confidence || null,
        keywordsMatched: classification?.keywordsMatched || [],
        isLeave: leaveResult.isLeave,
        leaveDetectionMethod: leaveResult.method,
        leaveConfidence: leaveResult.confidence,
        planningScore: eventPlanningScore,
      });
    }

    // Insert events
    if (processedEvents.length > 0) {
      await db.insert(events).values(processedEvents);
    }

    // Calculate audit period days
    const auditDays =
      Math.ceil(
        (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    // Calculate metrics
    const metrics = calculateMetrics(
      processedEvents.map((e) => ({
        durationMinutes: e.durationMinutes,
        finalTier: e.finalTier,
        vertical: e.vertical,
        isLeave: e.isLeave,
      })),
      {
        salaryAnnual: user.salaryAnnual ? Number(user.salaryAnnual) : null,
        equityPercentage: user.equityPercentage
          ? Number(user.equityPercentage)
          : null,
        companyValuation: user.companyValuation
          ? Number(user.companyValuation)
          : null,
        vestingPeriodYears: user.vestingPeriodYears
          ? Number(user.vestingPeriodYears)
          : null,
        seniorEngineeringRate: Number(user.seniorEngineeringRate) || 100000,
        seniorBusinessRate: Number(user.seniorBusinessRate) || 100000,
        juniorEngineeringRate: Number(user.juniorEngineeringRate) || 50000,
        juniorBusinessRate: Number(user.juniorBusinessRate) || 50000,
        eaRate: Number(user.eaRate) || 30000,
      },
      auditDays
    );

    // Calculate planning score (using original titles for scoring, not encrypted)
    const planningResult = calculatePlanningScore(
      rawEvents
        .filter(
          (raw) =>
            !activeExclusions.some((ex: string) =>
              raw.title.toLowerCase().includes(ex.toLowerCase())
            )
        )
        .map((raw) => ({
          title: raw.title,
          description: raw.description,
          durationMinutes: raw.isAllDay
            ? 8 * 60
            : Math.round(
                (new Date(raw.end).getTime() - new Date(raw.start).getTime()) /
                  (1000 * 60)
              ),
          isRecurring: raw.isRecurring,
          isAllDay: raw.isAllDay,
        })),
      auditDays
    );

    // Calculate leave statistics
    const leaveDaysDetected = processedEvents.filter((e) => e.isLeave).length;
    const leaveHoursExcluded = processedEvents
      .filter((e) => e.isLeave)
      .reduce((sum, e) => sum + e.durationMinutes / 60, 0);

    // Update audit run with metrics
    await db
      .update(audits)
      .set({
        status: 'completed',
        computedMetrics: metrics,
        planningScore: planningResult.score,
        planningAssessment: planningResult.assessment,
        leaveDaysDetected,
        leaveHoursExcluded: String(leaveHoursExcluded),
        completedAt: new Date(),
      })
      .where(eq(audits.id, auditRun.id));

    return NextResponse.json({
      auditId: auditRun.id,
      status: 'completed',
      eventCount: processedEvents.length,
      metrics,
      planningScore: planningResult.score,
    });
  } catch (error) {
    console.error('Audit creation error:', error);

    // Update audit run as failed
    await db
      .update(audits)
      .set({ status: 'failed' })
      .where(eq(audits.id, auditRun.id));

    return NextResponse.json(
      { error: 'Audit failed', details: String(error) },
      { status: 500 }
    );
  }
}

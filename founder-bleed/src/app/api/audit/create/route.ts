import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, users } from '@/lib/db/schema';
import { getEvents } from '@/lib/google-calendar';
import { classifyEvent } from '@/lib/classification';
import { detectLeave } from '@/lib/leave-detection';
import { calculateMetrics } from '@/lib/metrics';
import { calculatePlanningScore, calculateEventPlanningScore } from '@/lib/planning-score';
import { encrypt, decrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { dateStart, dateEnd, calendarIds, exclusions } = await request.json();

  // Get user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check solo founder
  const teamComposition = (user.teamComposition as Record<string, number>) || {};
  const isSoloFounder = teamComposition.founder === 1 &&
    Object.entries(teamComposition).filter(([k, v]) => k !== 'founder' && v > 0).length === 0;

  // Create audit run
  const [auditRun] = await db.insert(auditRuns).values({
    userId: session.user.id,
    dateStart: new Date(dateStart),
    dateEnd: new Date(dateEnd),
    calendarsIncluded: calendarIds || ['primary'],
    exclusionsUsed: exclusions || ['lunch', 'gym'],
    status: 'processing',
    algorithmVersion: '1.7'
  }).returning();

  try {
    // Fetch events from Google Calendar
    const rawEvents = await getEvents(
      session.user.id,
      calendarIds || ['primary'],
      dateStart,
      dateEnd
    );

    // Process events
    const processedEvents = [];
    for (const raw of rawEvents) {
      if (!raw.start || !raw.end) continue;
      const startStr = raw.start as string;
      const endStr = raw.end as string;

      // Check exclusions
      const isExcluded = (exclusions || ['lunch', 'gym']).some((ex: string) =>
        raw.title?.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExcluded) continue;

      // Detect leave
      const leaveResult = detectLeave(raw.title || '', raw.description || '', raw.isAllDay, raw.eventType || undefined);

      // Calculate duration
      let durationMinutes = 0;
      if (raw.isAllDay) {
        durationMinutes = 8 * 60; // 8 hours default
      } else {
        durationMinutes = Math.round(
          (new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60)
        );
      }

      // Classify (only if not leave)
      let classification = null;
      if (!leaveResult.isLeave) {
        classification = classifyEvent(raw.title || '', raw.description || '', raw.attendees, isSoloFounder);
      }

      // Calculate per-event planning score
      const eventPlanningScore = calculateEventPlanningScore({
        title: raw.title || '',
        description: raw.description || '',
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay: raw.isAllDay
      });

      processedEvents.push({
        auditRunId: auditRun.id,
        externalEventId: raw.id,
        startAt: new Date(startStr),
        endAt: new Date(endStr),
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
        planningScore: eventPlanningScore
      });
    }

    // Insert events
    if (processedEvents.length > 0) {
      await db.insert(events).values(processedEvents);
    }

    // Calculate metrics
    const auditDays = Math.ceil(
      (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24)
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
        seniorEngineeringRate: Number(user.seniorEngineeringRate),
        seniorBusinessRate: Number(user.seniorBusinessRate),
        juniorEngineeringRate: Number(user.juniorEngineeringRate),
        juniorBusinessRate: Number(user.juniorBusinessRate),
        eaRate: Number(user.eaRate)
      },
      auditDays
    );

    // Calculate planning score
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

    // Update audit run with metrics
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

    return NextResponse.json({
      auditId: auditRun.id,
      status: 'completed',
      eventCount: processedEvents.length
    });

  } catch (error) {
    console.error('Audit creation error:', error);
    await db.update(auditRuns)
      .set({ status: 'failed' })
      .where(eq(auditRuns.id, auditRun.id));

    return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
  }
}

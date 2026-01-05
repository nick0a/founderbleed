import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audits, events, users } from '@/lib/db/schema';
import { calculateMetrics } from '@/lib/metrics';
import { calculatePlanningScore } from '@/lib/planning-score';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';

// Recalculates metrics after tier changes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: auditId } = await params;

  // Verify audit belongs to user
  const auditResult = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.userId, session.user.id)))
    .limit(1);

  const audit = auditResult[0];

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get user data for rates
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const user = userResult[0];

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all events for this audit
  const auditEvents = await db
    .select()
    .from(events)
    .where(eq(events.auditId, auditId));

  // Calculate audit period days
  const auditDays =
    Math.ceil(
      (audit.dateEnd.getTime() - audit.dateStart.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  // Recalculate metrics using finalTier (which may have been user-modified)
  const metrics = calculateMetrics(
    auditEvents.map((e) => ({
      durationMinutes: e.durationMinutes || 0,
      finalTier: e.finalTier,
      vertical: e.vertical,
      isLeave: e.isLeave || false,
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

  // Recalculate planning score (decrypt titles for scoring)
  const planningResult = calculatePlanningScore(
    auditEvents
      .filter((e) => !e.isLeave)
      .map((e) => ({
        title: e.title ? decrypt(e.title) : 'Untitled',
        description: e.description ? decrypt(e.description) : null,
        durationMinutes: e.durationMinutes || 0,
        isRecurring: e.isRecurring || false,
        isAllDay: e.isAllDay || false,
      })),
    auditDays
  );

  // Calculate leave statistics
  const leaveDaysDetected = auditEvents.filter((e) => e.isLeave).length;
  const leaveHoursExcluded = auditEvents
    .filter((e) => e.isLeave)
    .reduce((sum, e) => sum + (e.durationMinutes || 0) / 60, 0);

  // Update audit with recalculated metrics
  await db
    .update(audits)
    .set({
      computedMetrics: metrics,
      planningScore: planningResult.score,
      planningAssessment: planningResult.assessment,
      leaveDaysDetected,
      leaveHoursExcluded: String(leaveHoursExcluded),
    })
    .where(eq(audits.id, auditId));

  return NextResponse.json({
    success: true,
    metrics,
    planningScore: planningResult.score,
    leaveDaysDetected,
    leaveHoursExcluded,
  });
}

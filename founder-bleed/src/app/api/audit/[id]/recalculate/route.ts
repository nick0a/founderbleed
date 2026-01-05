import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, users } from '@/lib/db/schema';
import { calculateMetrics } from '@/lib/metrics';
import { calculatePlanningScore } from '@/lib/planning-score';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get the audit run
  const auditRun = await db.query.auditRuns.findFirst({
    where: and(
      eq(auditRuns.id, id),
      eq(auditRuns.userId, session.user.id)
    )
  });

  if (!auditRun) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get all events for this audit
  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, id)
  });

  // Calculate metrics
  const auditDays = Math.ceil(
    (new Date(auditRun.dateEnd).getTime() - new Date(auditRun.dateStart).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const metrics = calculateMetrics(
    auditEvents.map(e => ({
      durationMinutes: e.durationMinutes || 0,
      finalTier: e.finalTier || 'senior',
      vertical: e.vertical || 'business',
      isLeave: e.isLeave || false
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

  // Recalculate planning score
  const planningResult = calculatePlanningScore(
    auditEvents.map(e => ({
      title: e.title ? decrypt(e.title) : '',
      description: e.description ? decrypt(e.description) : '',
      durationMinutes: e.durationMinutes || 0,
      isRecurring: e.isRecurring || false,
      isAllDay: e.isAllDay || false
    })),
    auditDays
  );

  // Update audit run with new metrics
  await db.update(auditRuns)
    .set({
      computedMetrics: metrics,
      planningScore: planningResult.score,
      planningAssessment: planningResult.assessment,
      leaveDaysDetected: auditEvents.filter(e => e.isLeave).length,
      leaveHoursExcluded: String(auditEvents.filter(e => e.isLeave).reduce((sum, e) => sum + (e.durationMinutes || 0) / 60, 0))
    })
    .where(eq(auditRuns.id, id));

  return NextResponse.json({
    auditId: id,
    status: 'recalculated',
    metrics,
    planningScore: planningResult.score
  });
}
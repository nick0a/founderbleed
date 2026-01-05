import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, users } from '@/lib/db/schema';
import { calculateMetrics } from '@/lib/metrics';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Get audit run
  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, id)
  });

  if (!auditRun || auditRun.userId !== session.user.id) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  // Get user data for rates
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get events
  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, id)
  });

  // Calculate metrics
  const auditDays = Math.ceil(
    (auditRun.dateEnd.getTime() - auditRun.dateStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const metrics = calculateMetrics(
    auditEvents.map(e => ({
      durationMinutes: e.durationMinutes || 0,
      finalTier: e.finalTier || 'senior', // Use finalTier (user edited) or default
      vertical: e.vertical || 'business',
      isLeave: e.isLeave || false
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

  // Update audit run
  await db.update(auditRuns)
    .set({
      computedMetrics: metrics,
      leaveDaysDetected: auditEvents.filter(e => e.isLeave).length,
      leaveHoursExcluded: String(auditEvents.filter(e => e.isLeave).reduce((sum, e) => sum + (e.durationMinutes || 0) / 60, 0))
    })
    .where(eq(auditRuns.id, id));

  return NextResponse.json({
    success: true,
    metrics
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audits, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Get audit by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: auditId } = await params;

  // Get audit with ownership check
  const auditResult = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.userId, session.user.id)))
    .limit(1);

  const audit = auditResult[0];

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Get event count for this audit
  const eventCount = await db
    .select()
    .from(events)
    .where(eq(events.auditId, auditId));

  return NextResponse.json({
    id: audit.id,
    userId: audit.userId,
    dateStart: audit.dateStart,
    dateEnd: audit.dateEnd,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    calendarsIncluded: audit.calendarsIncluded,
    exclusionsUsed: audit.exclusionsUsed,
    computedMetrics: audit.computedMetrics,
    planningScore: audit.planningScore,
    planningAssessment: audit.planningAssessment,
    status: audit.status,
    algorithmVersion: audit.algorithmVersion,
    leaveDaysDetected: audit.leaveDaysDetected,
    leaveHoursExcluded: audit.leaveHoursExcluded,
    frequency: audit.frequency,
    eventCount: eventCount.length,
  });
}

// Delete audit
export async function DELETE(
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

  // Delete audit (cascade will delete events)
  await db.delete(audits).where(eq(audits.id, auditId));

  return NextResponse.json({
    success: true,
    message: 'Audit deleted successfully',
  });
}

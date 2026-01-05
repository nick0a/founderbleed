import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, eventId } = await params;
  const { finalTier, reconciled, eventCategory } = await request.json();

  // Verify the audit belongs to the user
  const auditRun = await db.query.auditRuns.findFirst({
    where: and(
      eq(auditRuns.id, id),
      eq(auditRuns.userId, session.user.id)
    )
  });

  if (!auditRun) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Update the event
  const updateData: Record<string, unknown> = {};
  if (finalTier !== undefined) {
    updateData.finalTier = finalTier;
  }
  if (reconciled !== undefined) {
    updateData.reconciled = reconciled;
  }
  if (eventCategory !== undefined) {
    updateData.eventCategory = eventCategory;
  }

  await db.update(events)
    .set(updateData)
    .where(and(
      eq(events.id, eventId),
      eq(events.auditRunId, id)
    ));

  return NextResponse.json({ success: true, eventId, updated: updateData });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id, eventId } = await params;

  // Verify the audit belongs to the user
  const auditRun = await db.query.auditRuns.findFirst({
    where: and(
      eq(auditRuns.id, id),
      eq(auditRuns.userId, session.user.id)
    )
  });

  if (!auditRun) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  // Delete the event
  await db.delete(events)
    .where(and(
      eq(events.id, eventId),
      eq(events.auditRunId, id)
    ));

  return NextResponse.json({ success: true, eventId, deleted: true });
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audits, events } from '@/lib/db/schema';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';

// Get events for an audit with decrypted titles
export async function GET(
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

  // Get all events for this audit
  const auditEvents = await db
    .select()
    .from(events)
    .where(eq(events.auditId, auditId));

  // Decrypt titles and descriptions for display
  const decryptedEvents = auditEvents.map((event) => ({
    id: event.id,
    externalEventId: event.externalEventId,
    startAt: event.startAt,
    endAt: event.endAt,
    durationMinutes: event.durationMinutes,
    isAllDay: event.isAllDay,
    calendarId: event.calendarId,
    title: event.title ? decrypt(event.title) : 'Untitled',
    description: event.description ? decrypt(event.description) : null,
    attendeesCount: event.attendeesCount,
    hasMeetLink: event.hasMeetLink,
    isRecurring: event.isRecurring,
    suggestedTier: event.suggestedTier,
    finalTier: event.finalTier,
    reconciled: event.reconciled,
    businessArea: event.businessArea,
    vertical: event.vertical,
    confidenceScore: event.confidenceScore,
    keywordsMatched: event.keywordsMatched,
    isLeave: event.isLeave,
    leaveDetectionMethod: event.leaveDetectionMethod,
    leaveConfidence: event.leaveConfidence,
    planningScore: event.planningScore,
    createdAt: event.createdAt,
  }));

  return NextResponse.json({
    auditId,
    events: decryptedEvents,
    total: decryptedEvents.length,
  });
}

// Update event (tier, reconciled status, leave status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: auditId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { eventId, finalTier, reconciled, isLeave } = body;

  if (!eventId) {
    return NextResponse.json(
      { error: 'eventId is required' },
      { status: 400 }
    );
  }

  // Valid tiers
  const validTiers = ['unique', 'founder', 'senior', 'junior', 'ea'];
  if (finalTier !== undefined && !validTiers.includes(finalTier)) {
    return NextResponse.json(
      { error: 'Invalid tier. Must be one of: unique, founder, senior, junior, ea' },
      { status: 400 }
    );
  }

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

  // Verify event belongs to audit
  const eventResult = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.auditId, auditId)))
    .limit(1);

  const event = eventResult[0];

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  if (finalTier !== undefined) {
    updateData.finalTier = finalTier;
    // Auto-reconcile when tier is changed
    updateData.reconciled = true;
  }

  if (reconciled !== undefined) {
    updateData.reconciled = reconciled;
  }

  if (isLeave !== undefined) {
    updateData.isLeave = isLeave;
  }

  // Update event
  await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, eventId));

  return NextResponse.json({
    success: true,
    eventId,
    updates: updateData,
    message: 'Event updated. Call /recalculate to update metrics.',
  });
}

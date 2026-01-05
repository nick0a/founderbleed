import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events } from '@/lib/db/schema';
import { decrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';

export async function GET(
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

  // Get all events for this audit
  const auditEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, id)
  });

  // Decrypt event titles and descriptions
  const decryptedEvents = auditEvents.map(e => ({
    ...e,
    title: e.title ? decrypt(e.title) : '',
    description: e.description ? decrypt(e.description) : ''
  }));

  return NextResponse.json({
    audit: auditRun,
    events: decryptedEvents
  });
}
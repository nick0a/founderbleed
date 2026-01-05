import TriageClient from './triage-client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';

export default async function TriagePage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, auditId)
  });

  if (!auditRun || auditRun.userId !== session.user.id) redirect('/');

  const rawEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, auditId)
  });

  const decryptedEvents = rawEvents.map(e => ({
    ...e,
    title: decrypt(e.title || ''),
    description: e.description ? decrypt(e.description) : ''
  }));

  return (
    <TriageClient 
      auditId={auditId}
      initialEvents={decryptedEvents}
      teamComposition={{ founder: 1 }} // Should fetch from user
    />
  );
}

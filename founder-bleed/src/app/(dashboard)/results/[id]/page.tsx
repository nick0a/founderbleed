import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, users, roleRecommendations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/encryption';
import { generateRoleRecommendations } from '@/lib/role-clustering';
import ResultsClient from './results-client';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.id, id)
  });

  if (!auditRun || auditRun.userId !== session.user.id) redirect('/');

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) redirect('/signin');

  const rawEvents = await db.query.events.findMany({
    where: eq(events.auditRunId, id)
  });

  // Decrypt events
  const decryptedEvents = rawEvents.map(e => ({
    ...e,
    title: decrypt(e.title || ''),
    description: e.description ? decrypt(e.description) : ''
  }));

  // Check recommendations
  let recs = await db.query.roleRecommendations.findMany({
    where: eq(roleRecommendations.auditRunId, id)
  });

  if (recs.length === 0) {
    // Generate
    const generated = generateRoleRecommendations(
      decryptedEvents.map(e => ({
        title: e.title,
        finalTier: e.finalTier || 'senior',
        businessArea: e.businessArea || 'Operations',
        vertical: e.vertical || 'business',
        durationMinutes: e.durationMinutes || 0
      })),
      Math.ceil((auditRun.dateEnd.getTime() - auditRun.dateStart.getTime()) / (86400000)) + 1,
      {
        senior: Number(user.seniorEngineeringRate || 100000), // Default rates if null?
        junior: Number(user.juniorEngineeringRate || 50000),
        ea: Number(user.eaRate || 30000)
      }
    );

    // Save
    if (generated.length > 0) {
      await db.insert(roleRecommendations).values(
        generated.map(r => ({
          auditRunId: id,
          roleTitle: r.roleTitle,
          roleTier: r.roleTier,
          vertical: r.vertical,
          businessArea: r.businessArea,
          hoursPerWeek: String(r.hoursPerWeek),
          costWeekly: String(r.costWeekly),
          costMonthly: String(r.costMonthly),
          costAnnual: String(r.costAnnual),
          tasksList: r.tasks
        }))
      );
      recs = await db.query.roleRecommendations.findMany({
        where: eq(roleRecommendations.auditRunId, id)
      });
    }
  }

  return (
    <ResultsClient 
      auditRun={auditRun}
      user={user}
      events={decryptedEvents}
      recommendations={recs}
    />
  );
}

import PlanningClient from './planning-client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { requireSubscription } from '@/lib/subscription';

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  // Check subscription
  const subStatus = await requireSubscription(session.user.id);

  // Get latest audit
  const auditRun = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)]
  });

  return <PlanningClient 
    user={session.user} 
    auditRun={auditRun} 
    isSubscribed={subStatus.allowed}
  />;
}

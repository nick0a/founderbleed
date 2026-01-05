import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, subscriptions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function RedirectPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/signin');
  }

  // Check subscription status
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, session.user.id),
      eq(subscriptions.status, 'active')
    ),
  });

  const isSubscriber = !!subscription;

  if (isSubscriber) {
    // Subscribers go to dashboard
    redirect('/dashboard');
  }

  // For free users, check if they have an audit
  const latestAudit = await db.query.auditRuns.findFirst({
    where: eq(auditRuns.userId, session.user.id),
    orderBy: [desc(auditRuns.createdAt)],
  });

  if (latestAudit) {
    if (latestAudit.status === 'completed') {
      // Free user with completed audit -> Results
      redirect(`/results/${latestAudit.id}`);
    } else if (latestAudit.status === 'processing') {
      // Free user with processing audit -> Processing page (keep on results but will show loading)
      redirect(`/results/${latestAudit.id}`);
    }
  }

  // Free user with no audit -> New audit page
  redirect('/audit/new');
}

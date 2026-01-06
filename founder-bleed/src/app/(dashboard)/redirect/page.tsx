import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

  // Free users (new or returning) always go to processing page
  // This allows them to configure team composition, compensation, and date range
  // before starting a new audit
  redirect('/processing');
}

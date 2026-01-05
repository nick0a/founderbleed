import ProcessingClient from './processing-client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function ProcessingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) redirect('/signin');

  return <ProcessingClient user={user} />;
}

import SettingsClient from './settings-client';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, contacts } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) redirect('/signin');

  const userContacts = await db.query.contacts.findMany({
    where: or(
      eq(contacts.userId, session.user.id),
      eq(contacts.contactUserId, session.user.id)
    )
  });

  return (
    <SettingsClient 
      user={user} 
      initialContacts={userContacts}
    />
  );
}

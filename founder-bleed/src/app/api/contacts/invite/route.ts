import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contacts, users } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // Check if already invited or connected
  const existing = await db.query.contacts.findFirst({
    where: and(
        eq(contacts.userId, session.user.id),
        eq(contacts.contactEmail, email)
    )
  });

  if (existing) {
      return NextResponse.json({ error: 'Already invited' }, { status: 400 });
  }

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
  });

  await db.insert(contacts).values({
      userId: session.user.id,
      contactEmail: email,
      contactUserId: existingUser?.id,
      status: 'pending'
  });

  // Mock sending email
  console.log(`Sending invite email to ${email} from ${session.user.email}`);

  return NextResponse.json({ success: true });
}

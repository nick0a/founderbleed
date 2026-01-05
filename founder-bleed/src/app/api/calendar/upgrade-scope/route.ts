import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Returns instructions to trigger NextAuth signIn with upgraded scopes
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user already has write access
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  if (connection?.hasWriteAccess) {
    return NextResponse.json({ hasWriteAccess: true });
  }

  // Tell the client to use NextAuth signIn with additional scopes
  // This uses the already-registered callback URL
  return NextResponse.json({
    useNextAuthSignIn: true,
    callbackUrl: '/planning?write_access=granted',
  });
}

// Check current write access status
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  return NextResponse.json({
    hasCalendarConnection: !!connection,
    hasWriteAccess: connection?.hasWriteAccess ?? false,
    scopes: connection?.scopes ?? [],
  });
}

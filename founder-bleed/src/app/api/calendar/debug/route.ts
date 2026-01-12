import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Debug endpoint to check calendar connection status
// Access at: /api/calendar/debug
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({
      error: 'unauthorized',
      hasSession: false
    }, { status: 401 });
  }

  try {
    const connection = await db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, session.user.id)
    });

    if (!connection) {
      return NextResponse.json({
        status: 'no_connection',
        userId: session.user.id,
        email: session.user.email,
        message: 'No calendar connection found in database',
        fix: 'User needs to sign out and sign back in to create calendar connection'
      });
    }

    return NextResponse.json({
      status: 'connection_exists',
      userId: session.user.id,
      email: session.user.email,
      connection: {
        id: connection.id,
        provider: connection.provider,
        hasAccessToken: !!connection.accessToken,
        hasRefreshToken: !!connection.refreshToken,
        tokenExpiresAt: connection.tokenExpiresAt,
        isExpired: connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt) < new Date() : 'unknown',
        scopes: connection.scopes,
        hasWriteAccess: connection.hasWriteAccess,
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      userId: session.user.id,
      error: errorMessage
    }, { status: 500 });
  }
}

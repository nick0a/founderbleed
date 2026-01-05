import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listCalendars } from '@/lib/google-calendar';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // Get connection metadata
    const connection = await db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, session.user.id),
      columns: {
        id: true,
        provider: true,
        hasWriteAccess: true,
        connectedAt: true,
        scopes: true,
      },
    });

    // Only fetch calendars if we have a connection
    let calendars: Awaited<ReturnType<typeof listCalendars>> = [];
    if (connection) {
      try {
        calendars = await listCalendars(session.user.id);
      } catch {
        // Connection exists but may have invalid tokens
        console.error('Failed to list calendars, connection may need re-auth');
      }
    }

    return NextResponse.json({
      calendars,
      connection: connection || null,
    });
  } catch (error) {
    console.error('Calendar list error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}
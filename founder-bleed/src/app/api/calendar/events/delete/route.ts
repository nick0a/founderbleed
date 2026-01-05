import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/google-calendar';

export async function DELETE(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, calendarId = 'primary' } = await req.json();

  if (!eventId) {
    return NextResponse.json(
      { error: 'Missing required field: eventId' },
      { status: 400 }
    );
  }

  // Check write access
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id),
  });

  if (!connection) {
    return NextResponse.json(
      { error: 'no_calendar_connection' },
      { status: 400 }
    );
  }

  if (!connection.hasWriteAccess) {
    return NextResponse.json(
      { error: 'write_access_required' },
      { status: 403 }
    );
  }

  try {
    const calendar = await getCalendarClient(session.user.id);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Calendar event delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
    const errorDetails = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: unknown } }).response?.data
      : undefined;
    if (errorDetails) {
      console.error('Google API error details:', errorDetails);
    }
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { getCalendarClient } from '@/lib/google-calendar';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { title, start, end, description } = await request.json();

  // Check write access
  const connection = await db.query.calendarConnections.findFirst({
    where: eq(calendarConnections.userId, session.user.id)
  });

  if (!connection?.hasWriteAccess) {
    return NextResponse.json({ error: 'write_access_required' }, { status: 403 });
  }

  try {
    const calendar = await getCalendarClient(session.user.id);
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        start: { dateTime: start },
        end: { dateTime: end },
        description
      }
    });

    return NextResponse.json({ eventId: event.data.id });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, startTime, endTime, description, tier } = await req.json();

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'Missing required fields: title, startTime, endTime' },
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

    // Build event description with tier info if provided
    let eventDescription = description || '';
    if (tier) {
      eventDescription = eventDescription
        ? `${eventDescription}\n\n[Tier: ${tier}]`
        : `[Tier: ${tier}]`;
    }

    // Get user's timezone from their calendar settings, fallback to Asia/Singapore
    let userTimeZone = 'Asia/Singapore';
    try {
      const calendarSettings = await calendar.settings.get({ setting: 'timezone' });
      userTimeZone = calendarSettings.data.value || 'Asia/Singapore';
      console.log('User timezone from Google Calendar:', userTimeZone);
    } catch (tzError) {
      console.log('Could not fetch timezone, using default:', userTimeZone, tzError);
    }

    console.log('Creating event:', { title, startTime, endTime, userTimeZone });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        start: { dateTime: startTime, timeZone: userTimeZone },
        end: { dateTime: endTime, timeZone: userTimeZone },
        description: eventDescription,
      },
    });

    return NextResponse.json({
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
    });
  } catch (error: unknown) {
    console.error('Calendar event create error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
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

// Calendar Event Create API - Add events to user's calendar
// POST: Create new event in Google Calendar
// Requires calendar write access

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, startTime, endTime, description, colorId } = await request.json();

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Title, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Check calendar connection and write access
    const [connection] = await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, session.user.id))
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { error: 'calendar_not_connected' },
        { status: 400 }
      );
    }

    if (!connection.hasWriteAccess) {
      return NextResponse.json(
        { error: 'write_access_required' },
        { status: 403 }
      );
    }

    // Create Google Calendar client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create the event
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || 'Created by Founder Bleed Planning Assistant',
        start: {
          dateTime: new Date(startTime).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(endTime).toISOString(),
          timeZone: 'UTC',
        },
        colorId: colorId || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error('Calendar event create error:', error);
    
    // Check for specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json(
          { error: 'token_expired', message: 'Please reconnect your calendar' },
          { status: 401 }
        );
      }
      if (error.message.includes('insufficientPermissions')) {
        return NextResponse.json(
          { error: 'write_access_required' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

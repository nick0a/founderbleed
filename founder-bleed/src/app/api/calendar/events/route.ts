import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const calendarIds = searchParams.get('calendarIds')?.split(',') || ['primary'];
  const dateStart = searchParams.get('dateStart');
  const dateEnd = searchParams.get('dateEnd');

  if (!dateStart || !dateEnd) {
    return NextResponse.json({ error: 'dateStart and dateEnd required' }, { status: 400 });
  }

  try {
    const events = await getEvents(session.user.id, calendarIds, dateStart, dateEnd);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar events error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (errorMessage.includes('No calendar connection found')) {
      return NextResponse.json({
        error: 'no_calendar_connection',
        message: 'Please reconnect your Google Calendar'
      }, { status: 400 });
    }

    if (errorMessage.includes('invalid_grant') || errorMessage.includes('Token has been expired or revoked')) {
      return NextResponse.json({
        error: 'token_expired',
        message: 'Your Google Calendar access has expired. Please reconnect.'
      }, { status: 401 });
    }

    return NextResponse.json({
      error: 'calendar_error',
      message: 'Failed to fetch calendar events'
    }, { status: 500 });
  }
}
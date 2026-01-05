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
    return NextResponse.json(
      { error: 'dateStart and dateEnd required' },
      { status: 400 }
    );
  }

  try {
    const events = await getEvents(
      session.user.id,
      calendarIds,
      dateStart,
      dateEnd
    );
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

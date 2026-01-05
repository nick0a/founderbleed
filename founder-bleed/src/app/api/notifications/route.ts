import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userNotifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 20,
  });

  const unreadCount = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, session.user.id),
      isNull(notifications.readAt)
    ),
  });

  return NextResponse.json({
    notifications: userNotifications,
    unreadCount: unreadCount.length,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, title, body: notifBody, link } = body;

    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }

    const [notification] = await db.insert(notifications).values({
      userId: session.user.id,
      type: type || 'system',
      title,
      body: notifBody,
      link,
    }).returning();

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

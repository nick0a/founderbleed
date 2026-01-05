import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Update notification as read
  const [updated] = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.userId, session.user.id)
    ))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

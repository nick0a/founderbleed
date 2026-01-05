import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarConnections, accounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delete the calendar connection
    await db.delete(calendarConnections)
      .where(eq(calendarConnections.userId, session.user.id));

    // Optionally, we can also revoke the token with Google
    // For now, just delete from our DB

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 });
  }
}

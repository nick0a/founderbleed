import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planningSessions } from '@/lib/db/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Get all sessions for the user (excludes deleted)
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  try {
    let sessions;
    if (includeArchived) {
      // Get all non-deleted sessions
      sessions = await db.query.planningSessions.findMany({
        where: and(
          eq(planningSessions.userId, session.user.id),
          ne(planningSessions.status, 'deleted')
        ),
        orderBy: [desc(planningSessions.updatedAt)],
      });
    } else {
      // Get only active sessions
      sessions = await db.query.planningSessions.findMany({
        where: and(
          eq(planningSessions.userId, session.user.id),
          eq(planningSessions.status, 'active')
        ),
        orderBy: [desc(planningSessions.updatedAt)],
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch planning sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// Create a new session
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, auditRunId } = body;

    const [newSession] = await db.insert(planningSessions).values({
      userId: session.user.id,
      auditRunId: auditRunId || null,
      title: title || null,
      conversationHistory: [],
      plannedEvents: [],
      status: 'active',
    }).returning();

    return NextResponse.json({ session: newSession });
  } catch (error) {
    console.error('Failed to create planning session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

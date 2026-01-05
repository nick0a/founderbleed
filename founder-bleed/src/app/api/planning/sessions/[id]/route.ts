import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { planningSessions, subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai-budget';
import { generateText } from 'ai';

// Generate a title for the conversation using LLM
async function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  userId: string
): Promise<string | null> {
  // Need at least one user message to generate a title
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return null;

  // Take first few messages for context (limit to save tokens)
  const contextMessages = messages.slice(0, 4);
  const conversationPreview = contextMessages
    .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n');

  try {
    const { model } = await getAIProvider(userId);

    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: `Generate a short, descriptive title (maximum 30 characters, 4-5 words) for this planning conversation. The title should help the user remember what this conversation was about. Only output the title text, nothing else. Do not use quotes.

Conversation:
${conversationPreview}`,
        },
      ],
      providerOptions: {
        openai: {
          maxTokens: 20,
        },
      },
    });

    const title = result.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    // Hard limit at 30 characters
    return title.length > 30 ? title.slice(0, 27) + '...' : title;
  } catch (error) {
    console.error('Failed to generate title:', error);
    return null;
  }
}

// Get a specific session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const planningSession = await db.query.planningSessions.findFirst({
      where: and(
        eq(planningSessions.id, id),
        eq(planningSessions.userId, session.user.id)
      ),
    });

    if (!planningSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: planningSession });
  } catch (error) {
    console.error('Failed to fetch planning session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// Update a session (title, messages, archive, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify ownership
    const existing = await db.query.planningSessions.findFirst({
      where: and(
        eq(planningSessions.id, id),
        eq(planningSessions.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, conversationHistory, plannedEvents, status } = body;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (conversationHistory !== undefined) updateData.conversationHistory = conversationHistory;
    if (plannedEvents !== undefined) updateData.plannedEvents = plannedEvents;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'archived') {
        updateData.archivedAt = new Date();
      } else if (status === 'active') {
        updateData.archivedAt = null;
      }
    }

    // Auto-generate title if conversation has messages but no title yet
    if (
      conversationHistory !== undefined &&
      !existing.title &&
      title === undefined &&
      Array.isArray(conversationHistory) &&
      conversationHistory.length >= 2 // At least one user + one assistant message
    ) {
      const generatedTitle = await generateConversationTitle(
        conversationHistory,
        session.user.id
      );
      if (generatedTitle) {
        updateData.title = generatedTitle;
      }
    }

    const [updated] = await db.update(planningSessions)
      .set(updateData)
      .where(and(
        eq(planningSessions.id, id),
        eq(planningSessions.userId, session.user.id)
      ))
      .returning();

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Failed to update planning session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// Delete a session (soft delete by setting status to 'deleted')
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify ownership
    const existing = await db.query.planningSessions.findFirst({
      where: and(
        eq(planningSessions.id, id),
        eq(planningSessions.userId, session.user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Soft delete
    await db.update(planningSessions)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(and(
        eq(planningSessions.id, id),
        eq(planningSessions.userId, session.user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete planning session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

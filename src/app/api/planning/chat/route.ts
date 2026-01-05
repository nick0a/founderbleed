// Planning Chat API - AI-powered planning assistant
// POST: Send message and get AI response
// GET: Get current session and history

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccessFeature } from '@/lib/subscription';
import {
  getOrCreateSession,
  addMessageToSession,
  generateAIResponse,
  getAuditContext,
  type ChatMessage,
} from '@/lib/planning-ai';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription access
    const hasAccess = await canAccessFeature(session.user.id, 'planningAssistant');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'subscription_required', feature: 'planningAssistant' },
        { status: 403 }
      );
    }

    // Get or create session
    const planningSession = await getOrCreateSession(session.user.id);
    const context = await getAuditContext(session.user.id);

    return NextResponse.json({
      sessionId: planningSession.id,
      messages: planningSession.messages,
      context: context
        ? {
            efficiencyScore: context.efficiencyScore,
            planningScore: context.planningScore,
          }
        : null,
    });
  } catch (error) {
    console.error('Planning chat GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription access
    const hasAccess = await canAccessFeature(session.user.id, 'planningAssistant');
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'subscription_required', feature: 'planningAssistant' },
        { status: 403 }
      );
    }

    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get or create session
    const planningSession = sessionId
      ? { id: sessionId, messages: [] }
      : await getOrCreateSession(session.user.id);

    // Get audit context
    const context = await getAuditContext(session.user.id);
    if (!context) {
      return NextResponse.json(
        { error: 'No audit data found. Please run an audit first.' },
        { status: 400 }
      );
    }

    // Add user message to session
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    await addMessageToSession(planningSession.id, userMessage);

    // Get all messages for context
    const updatedSession = await getOrCreateSession(session.user.id);
    
    // Generate AI response
    const aiResponse = await generateAIResponse(updatedSession.messages, context);

    // Add assistant message to session
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      eventSuggestions: aiResponse.eventSuggestions,
    };
    await addMessageToSession(planningSession.id, assistantMessage);

    return NextResponse.json({
      sessionId: planningSession.id,
      message: assistantMessage,
    });
  } catch (error) {
    console.error('Planning chat POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

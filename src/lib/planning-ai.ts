// Planning AI - AI-powered calendar planning assistant
// Uses LLM to help founders optimize their calendar

import { db } from '@/lib/db';
import { planningSessions, audits, events } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  eventSuggestions?: EventSuggestion[];
}

export interface EventSuggestion {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string;
  tier: 'unique' | 'founder' | 'senior' | 'junior' | 'ea';
  description?: string;
  status: 'pending' | 'added' | 'dismissed';
}

export interface AuditContext {
  efficiencyScore: number;
  planningScore: number;
  hoursByTier: {
    unique: number;
    founder: number;
    senior: number;
    junior: number;
    ea: number;
  };
  topDelegableTasks: string[];
  totalHoursAnalyzed: number;
}

/**
 * Build system prompt with audit context
 */
export function buildSystemPrompt(context: AuditContext): string {
  return `You are a productivity coach helping founders optimize their calendar.
You have access to their audit results showing how they spend time.

User's Audit Data:
- Efficiency Score: ${context.efficiencyScore}%
- Planning Score: ${context.planningScore}%
- Hours by tier: Unique: ${context.hoursByTier.unique}h, Founder: ${context.hoursByTier.founder}h, Senior: ${context.hoursByTier.senior}h, Junior: ${context.hoursByTier.junior}h, EA: ${context.hoursByTier.ea}h
- Top delegable tasks: ${context.topDelegableTasks.join(', ')}
- Total hours analyzed: ${context.totalHoursAnalyzed}h

When suggesting calendar changes:
- Be specific with times and durations
- Explain why each change helps
- Consider their role (mostly Unique/Founder work vs delegable)
- Suggest protecting time for high-value work
- Recommend delegating low-value tasks

You can suggest new events to add to their calendar.
When suggesting events, format them as JSON blocks that I can parse:

\`\`\`event
{
  "type": "event_suggestion",
  "title": "Focus: Product Strategy",
  "start": "2026-01-07T09:00:00",
  "end": "2026-01-07T12:00:00",
  "tier": "unique",
  "description": "Protected time for strategic product work"
}
\`\`\`

Be concise but helpful. Focus on actionable advice that helps them reclaim time.`;
}

/**
 * Get audit context for a user's most recent audit
 */
export async function getAuditContext(userId: string, auditId?: string): Promise<AuditContext | null> {
  // Get the specific audit or most recent
  const query = auditId
    ? db.select().from(audits).where(eq(audits.id, auditId)).limit(1)
    : db.select().from(audits).where(eq(audits.userId, userId)).orderBy(desc(audits.createdAt)).limit(1);

  const [audit] = await query;

  if (!audit || !audit.computedMetrics) {
    return null;
  }

  const metrics = audit.computedMetrics as Record<string, unknown>;

  // Get events for top delegable tasks
  const auditEvents = await db
    .select()
    .from(events)
    .where(eq(events.auditId, audit.id));

  // Find most common delegable task titles
  const delegableTasks = auditEvents
    .filter((e) => e.finalTier && ['senior', 'junior', 'ea'].includes(e.finalTier))
    .map((e) => e.title || 'Untitled')
    .slice(0, 5);

  return {
    efficiencyScore: Math.round(Number(metrics.efficiencyScore || 0)),
    planningScore: audit.planningScore || 0,
    hoursByTier: {
      unique: Number(metrics.uniqueHours || 0),
      founder: Number(metrics.founderHours || 0),
      senior: Number(metrics.seniorHours || 0),
      junior: Number(metrics.juniorHours || 0),
      ea: Number(metrics.eaHours || 0),
    },
    topDelegableTasks: [...new Set(delegableTasks)],
    totalHoursAnalyzed: Number(metrics.totalHours || 0),
  };
}

/**
 * Parse event suggestions from AI response
 */
export function parseEventSuggestions(content: string): EventSuggestion[] {
  const suggestions: EventSuggestion[] = [];
  
  // Match ```event ... ``` blocks
  const eventBlockRegex = /```event\s*([\s\S]*?)```/g;
  let match;

  while ((match = eventBlockRegex.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.type === 'event_suggestion' && parsed.title && parsed.start && parsed.end) {
        suggestions.push({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: parsed.title,
          start: parsed.start,
          end: parsed.end,
          tier: parsed.tier || 'unique',
          description: parsed.description,
          status: 'pending',
        });
      }
    } catch {
      // Skip invalid JSON blocks
      console.warn('Failed to parse event suggestion:', match[1]);
    }
  }

  return suggestions;
}

/**
 * Create or get active planning session
 */
export async function getOrCreateSession(
  userId: string,
  auditId?: string
): Promise<{ id: string; messages: ChatMessage[] }> {
  // Check for active session
  const [existing] = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.userId, userId))
    .orderBy(desc(planningSessions.createdAt))
    .limit(1);

  if (existing && existing.status === 'active') {
    return {
      id: existing.id,
      messages: (existing.conversationHistory as ChatMessage[]) || [],
    };
  }

  // Create new session
  const [newSession] = await db
    .insert(planningSessions)
    .values({
      userId,
      auditId: auditId || null,
      sessionType: 'weekly',
      conversationHistory: [],
      plannedEvents: [],
      status: 'active',
    })
    .returning();

  return {
    id: newSession.id,
    messages: [],
  };
}

/**
 * Add message to session history
 */
export async function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const [session] = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const history = (session.conversationHistory as ChatMessage[]) || [];
  history.push(message);

  await db
    .update(planningSessions)
    .set({
      conversationHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));
}

/**
 * Update event suggestion status in session
 */
export async function updateEventStatus(
  sessionId: string,
  eventId: string,
  status: 'added' | 'dismissed'
): Promise<void> {
  const [session] = await db
    .select()
    .from(planningSessions)
    .where(eq(planningSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const history = (session.conversationHistory as ChatMessage[]) || [];
  
  // Find and update the event in conversation history
  for (const msg of history) {
    if (msg.eventSuggestions) {
      const event = msg.eventSuggestions.find((e) => e.id === eventId);
      if (event) {
        event.status = status;
      }
    }
  }

  await db
    .update(planningSessions)
    .set({
      conversationHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(planningSessions.id, sessionId));
}

/**
 * Generate AI response (mock for MVP - production would use OpenAI/Anthropic)
 */
export async function generateAIResponse(
  messages: ChatMessage[],
  context: AuditContext
): Promise<{ content: string; eventSuggestions: EventSuggestion[] }> {
  // For MVP, return a helpful mock response
  // Production would call OpenAI/Anthropic API here
  
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
  const userInput = lastUserMessage?.content.toLowerCase() || '';

  // Simple response generation based on keywords
  let content = '';
  const suggestions: EventSuggestion[] = [];

  if (userInput.includes('plan') || userInput.includes('week')) {
    content = `Based on your audit data, you're spending ${context.hoursByTier.junior + context.hoursByTier.ea}h/week on tasks that could be delegated. Your Planning Score is ${context.planningScore}% - there's room for improvement!

Here are my recommendations:

1. **Protect your mornings for Unique work** - Schedule deep focus blocks
2. **Batch similar meetings** - Group your calls together
3. **Delegate recurring tasks** - ${context.topDelegableTasks[0] || 'Administrative work'} should be handled by your team

Would you like me to suggest specific time blocks for your calendar?`;
  } else if (userInput.includes('focus') || userInput.includes('block')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(12, 0, 0, 0);

    content = `Great idea! Here's a suggested focus block for tomorrow:

\`\`\`event
{
  "type": "event_suggestion",
  "title": "Focus: Deep Work Block",
  "start": "${tomorrow.toISOString().slice(0, -5)}",
  "end": "${tomorrowEnd.toISOString().slice(0, -5)}",
  "tier": "unique",
  "description": "Protected time for high-value founder work. No meetings allowed."
}
\`\`\`

This 3-hour block in the morning is ideal for your most important strategic work. Would you like me to add more focus blocks throughout the week?`;
    
    suggestions.push({
      id: `evt_${Date.now()}_focus`,
      title: 'Focus: Deep Work Block',
      start: tomorrow.toISOString(),
      end: tomorrowEnd.toISOString(),
      tier: 'unique',
      description: 'Protected time for high-value founder work. No meetings allowed.',
      status: 'pending',
    });
  } else if (userInput.includes('delegate') || userInput.includes('help')) {
    content = `Based on your audit, here are tasks you should delegate:

**Junior-level tasks (${context.hoursByTier.junior}h/week):**
- ${context.topDelegableTasks[0] || 'Research and data gathering'}
- ${context.topDelegableTasks[1] || 'Documentation updates'}

**EA-level tasks (${context.hoursByTier.ea}h/week):**
- Calendar management and scheduling
- Travel booking and coordination
- Meeting prep and follow-ups

Delegating these tasks could save you ${(context.hoursByTier.junior + context.hoursByTier.ea).toFixed(1)} hours per week!

What's your top priority this week?`;
  } else {
    content = `I'm here to help you optimize your calendar and reclaim your time!

**Your Current Stats:**
- Efficiency Score: ${context.efficiencyScore}%
- Planning Score: ${context.planningScore}%
- Hours on delegable work: ${(context.hoursByTier.junior + context.hoursByTier.ea).toFixed(1)}h/week

What would you like to focus on?
- Plan your week
- Add focus blocks
- Identify tasks to delegate
- Review your time allocation`;
  }

  // Parse any event suggestions from the generated content
  const parsedSuggestions = parseEventSuggestions(content);
  
  return {
    content,
    eventSuggestions: [...suggestions, ...parsedSuggestions],
  };
}

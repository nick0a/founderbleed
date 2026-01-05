import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { auditRuns, subscriptions, events } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { getAIProvider } from '@/lib/ai-budget';
import { trackLLMUsage } from '@/lib/subscription';
import { calculateCostCents } from '@/lib/ai';
import { decrypt } from '@/lib/encryption';
import { getEvents, listCalendars } from '@/lib/google-calendar';

export const maxDuration = 60;

// Helper to extract text from UIMessage parts
function getTextFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

// Parse user message for specific date period requests
// Returns date range if found, null otherwise
function parseHistoricalDateRequest(text: string): { start: Date; end: Date; label: string } | null {
  const lowerText = text.toLowerCase();

  // Match patterns like "december 2024", "dec 2024", "first week of december 2024"
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const monthAbbrevs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  // Check for "first week of [month] [year]" pattern
  const firstWeekMatch = lowerText.match(/first\s+week\s+(?:of\s+)?(\w+)\s+(\d{4})/);
  if (firstWeekMatch) {
    const monthStr = firstWeekMatch[1];
    const year = parseInt(firstWeekMatch[2]);
    let monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex === -1) monthIndex = monthAbbrevs.indexOf(monthStr);

    if (monthIndex !== -1 && year >= 2020 && year <= 2030) {
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex, 7, 23, 59, 59);
      return { start, end, label: `first week of ${monthNames[monthIndex]} ${year}` };
    }
  }

  // Check for "second/third/fourth/last week of [month] [year]" pattern
  const weekMatch = lowerText.match(/(second|third|fourth|last)\s+week\s+(?:of\s+)?(\w+)\s+(\d{4})/);
  if (weekMatch) {
    const weekNum = weekMatch[1];
    const monthStr = weekMatch[2];
    const year = parseInt(weekMatch[3]);
    let monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex === -1) monthIndex = monthAbbrevs.indexOf(monthStr);

    if (monthIndex !== -1 && year >= 2020 && year <= 2030) {
      let startDay: number;
      let endDay: number;
      const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();

      if (weekNum === 'second') { startDay = 8; endDay = 14; }
      else if (weekNum === 'third') { startDay = 15; endDay = 21; }
      else if (weekNum === 'fourth') { startDay = 22; endDay = 28; }
      else { startDay = lastDayOfMonth - 6; endDay = lastDayOfMonth; } // last week

      const start = new Date(year, monthIndex, startDay);
      const end = new Date(year, monthIndex, Math.min(endDay, lastDayOfMonth), 23, 59, 59);
      return { start, end, label: `${weekNum} week of ${monthNames[monthIndex]} ${year}` };
    }
  }

  // Check for "[month] [year]" pattern (entire month)
  for (let i = 0; i < monthNames.length; i++) {
    const monthPatterns = [
      new RegExp(`\\b${monthNames[i]}\\s+(\\d{4})\\b`),
      new RegExp(`\\b${monthAbbrevs[i]}\\s+(\\d{4})\\b`),
    ];

    for (const pattern of monthPatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 2020 && year <= 2030) {
          const start = new Date(year, i, 1);
          const end = new Date(year, i + 1, 0, 23, 59, 59); // Last day of month
          return { start, end, label: `${monthNames[i]} ${year}` };
        }
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, session.user.id),
  });

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const body = await req.json();
  // AI SDK v6 sends messages in UIMessage format with parts array
  const uiMessages: UIMessage[] = body.messages || [];
  const auditId: string | undefined = body.auditId;
  const plannableDays: number[] = body.plannableDays || [1, 2, 3, 4, 5]; // Default Mon-Fri

  // Get audit data for context injection
  let auditContext = '';
  let topDelegableTasks: string[] = [];

  // Get the latest audit if no auditId specified
  let targetAuditId = auditId;
  if (!targetAuditId) {
    const latestAudit = await db.query.auditRuns.findFirst({
      where: eq(auditRuns.userId, session.user.id),
      orderBy: [desc(auditRuns.createdAt)],
    });
    targetAuditId = latestAudit?.id;
  }

  if (targetAuditId) {
    const audit = await db.query.auditRuns.findFirst({
      where: eq(auditRuns.id, targetAuditId),
    });

    if (audit?.computedMetrics) {
      const metrics = audit.computedMetrics as {
        efficiencyScore: number;
        hoursByTier: Record<string, number>;
        reclaimableHoursPerWeek: number;
      };

      // Get delegable tasks (senior, junior, ea tier events)
      const delegableEvents = await db.query.events.findMany({
        where: eq(events.auditRunId, targetAuditId),
      });

      // Decrypt and collect delegable tasks
      const delegableTiers = ['senior', 'junior', 'ea'];
      const taskMap = new Map<string, number>();

      for (const event of delegableEvents) {
        const finalTier = event.finalTier || event.suggestedTier;
        if (finalTier && delegableTiers.includes(finalTier) && event.title) {
          try {
            const decryptedTitle = decrypt(event.title);
            const current = taskMap.get(decryptedTitle) || 0;
            taskMap.set(decryptedTitle, current + (event.durationMinutes || 0));
          } catch {
            // Skip if decryption fails
          }
        }
      }

      // Sort by hours and take top 5
      const sortedTasks = Array.from(taskMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([task, mins]) => `${task} (${Math.round(mins / 60)}h)`);

      topDelegableTasks = sortedTasks;

      auditContext = `
User's Audit Data:
- Efficiency Score: ${Math.round(metrics.efficiencyScore)}%
- Planning Score: ${audit.planningScore ?? 'Not calculated'}%
- Hours by tier: Unique: ${Math.round(metrics.hoursByTier?.unique || 0)}h, Founder: ${Math.round(metrics.hoursByTier?.founder || 0)}h, Senior: ${Math.round(metrics.hoursByTier?.senior || 0)}h, Junior: ${Math.round(metrics.hoursByTier?.junior || 0)}h, EA: ${Math.round(metrics.hoursByTier?.ea || 0)}h
- Reclaimable hours per week: ${Math.round(metrics.reclaimableHoursPerWeek || 0)}h
- Top delegable tasks: ${topDelegableTasks.length > 0 ? topDelegableTasks.join(', ') : 'None identified'}
`;
    }
  }

  // Get current date for event suggestions (in Singapore timezone)
  const now = new Date();
  const singaporeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const currentDateStr = singaporeFormatter.format(now);

  // Get current time in Singapore
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTimeStr = timeFormatter.format(now);

  // Helper function to format events by day
  const formatEventsByDay = (
    eventsToFormat: Array<{
      start?: string | null;
      end?: string | null;
      title: string;
      isAllDay?: boolean;
    }>,
    maxEvents: number
  ): string[] => {
    const eventsByDay = new Map<string, typeof eventsToFormat>();

    for (const event of eventsToFormat) {
      if (!event.start) continue;
      const eventDate = new Date(event.start);
      const dayKey = eventDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });

      if (!eventsByDay.has(dayKey)) {
        eventsByDay.set(dayKey, []);
      }
      eventsByDay.get(dayKey)!.push(event);
    }

    const lines: string[] = [];
    let eventCount = 0;

    for (const [day, dayEvents] of eventsByDay) {
      if (eventCount >= maxEvents) break;

      const dayOfWeek = new Date(day).toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Singapore',
      });
      lines.push(`\n${dayOfWeek} ${day}:`);

      for (const event of dayEvents) {
        if (eventCount >= maxEvents) break;
        if (event.isAllDay) {
          lines.push(`  - [All day] ${event.title}`);
        } else {
          const startTime = new Date(event.start!).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Singapore',
          });
          const endTime = new Date(event.end!).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Singapore',
          });
          lines.push(`  - ${startTime}-${endTime}: ${event.title}`);
        }
        eventCount++;
      }
    }

    return lines;
  };

  // Fetch calendar events for context (historical + upcoming)
  let calendarContext = '';
  let historicalContext = '';
  let requestedPeriodContext = '';

  // Check if user is requesting a specific historical period
  const lastUserMessage = uiMessages.filter((m) => m.role === 'user').pop();
  const lastUserText = lastUserMessage ? getTextFromUIMessage(lastUserMessage) : '';
  const requestedPeriod = parseHistoricalDateRequest(lastUserText);

  try {
    const calendars = await listCalendars(session.user.id);
    const calendarIds = calendars.map((c) => c.id).filter(Boolean) as string[];

    if (calendarIds.length > 0) {
      // Get upcoming events (next 2 weeks)
      const upcomingStart = new Date();
      const upcomingEnd = new Date();
      upcomingEnd.setDate(upcomingEnd.getDate() + 14);

      const upcomingEvents = await getEvents(
        session.user.id,
        calendarIds,
        upcomingStart.toISOString(),
        upcomingEnd.toISOString()
      );

      if (upcomingEvents.length > 0) {
        const upcomingLines = formatEventsByDay(upcomingEvents, 50);
        calendarContext = `
User's Upcoming Calendar (next 2 weeks):
${upcomingLines.join('\n')}
`;
      }

      // Get historical events (past 6 weeks) for pattern recognition
      const historicalEnd = new Date();
      const historicalStart = new Date();
      historicalStart.setDate(historicalStart.getDate() - 42); // 6 weeks back

      const historicalEvents = await getEvents(
        session.user.id,
        calendarIds,
        historicalStart.toISOString(),
        historicalEnd.toISOString()
      );

      if (historicalEvents.length > 0) {
        const historicalLines = formatEventsByDay(historicalEvents, 100);
        historicalContext = `
User's Historical Calendar (past 6 weeks - use this to understand their patterns and preferences):
${historicalLines.join('\n')}
`;
      }

      // Fetch specific requested period if detected
      if (requestedPeriod) {
        console.log(`Fetching requested historical period: ${requestedPeriod.label}`);
        const periodEvents = await getEvents(
          session.user.id,
          calendarIds,
          requestedPeriod.start.toISOString(),
          requestedPeriod.end.toISOString()
        );

        if (periodEvents.length > 0) {
          const periodLines = formatEventsByDay(periodEvents, 100);
          requestedPeriodContext = `
REQUESTED HISTORICAL PERIOD - User asked about "${requestedPeriod.label}":
Use this data to replicate the pattern/structure when planning:
${periodLines.join('\n')}
`;
        } else {
          requestedPeriodContext = `
Note: No calendar events found for the requested period "${requestedPeriod.label}". The calendar may not have data from that time.
`;
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch calendar events for context:', error);
    // Continue without calendar context
  }

  // Convert plannable days to day names for the system prompt
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const plannableDayNames = plannableDays.map((d) => dayNames[d]).join(', ');

  const systemPrompt = `You are a productivity coach helping founders optimize their calendar.
You have access to their audit results, their HISTORICAL calendar (past 6 weeks), AND their upcoming calendar events.
Today's date is ${currentDateStr} and the current time is ${currentTimeStr} Singapore Time (SGT, UTC+8).

USER'S PLANNABLE DAYS: ${plannableDayNames}
IMPORTANT: Only suggest events on these days. The user has configured their settings to only plan on ${plannableDayNames}. Do NOT suggest events on other days of the week.

${auditContext}
${historicalContext}
${calendarContext}
${requestedPeriodContext}

HISTORICAL PATTERN MATCHING:
- When the user references a specific past period (e.g., "like December 2024", "same as first week of November 2025"), you will see that period's events in the REQUESTED HISTORICAL PERIOD section above
- Study the exact event names, times, and patterns from that period
- Replicate the structure, timing, and event types when creating suggestions for the future
- If no events are found for the requested period, inform the user

PLANNING APPROACH:
- When the user asks to plan their day/week/month, proactively suggest MULTIPLE events in bulk
- Look at their existing calendar to avoid conflicts and find optimal time slots
- For weekly planning, suggest 5-10+ events covering focus time, meetings, and breaks
- For daily planning, suggest 3-5 events for the specific day
- Be bold - suggest a complete schedule structure, not just one event at a time

When suggesting calendar changes:
- Be specific with times and durations
- AVOID conflicts with existing calendar events shown above
- Consider their role (mostly Unique/Founder work vs delegable)
- Suggest protecting time for high-value work
- Recommend delegating low-value tasks to other team members
- Group similar activities together (e.g., all 1:1s on one day)

IMPORTANT: When you want to suggest adding events to the calendar, you MUST output each event as a JSON code block in this EXACT format. The user's UI will parse these and show "Add to Calendar" buttons:

\`\`\`json
{
  "type": "event_suggestion",
  "title": "Focus: Product Strategy",
  "start": "2026-01-07T09:00:00",
  "end": "2026-01-07T12:00:00",
  "tier": "unique"
}
\`\`\`

Rules for event suggestions:
- Use dates starting from ${currentDateStr} or later
- Use ISO 8601 datetime format WITHOUT timezone suffix (YYYY-MM-DDTHH:MM:SS) - the backend will apply Singapore timezone (UTC+8)
- All times should be in Singapore local time (e.g., if user says "1pm", use 13:00)
- tier must be one of: "unique", "founder", "senior", "junior", "ea"
- Output ONE json code block per event
- Always include the "type": "event_suggestion" field
- When user asks for bulk planning (day/week/month), output MANY separate JSON code blocks - don't hold back!
- Check the user's existing calendar above and don't schedule over existing events

IMPORTANT - RESPONSE FORMAT:
- After suggesting events, ALWAYS end with a brief summary or outro paragraph
- This closing should summarize what was suggested and invite the user to add events or ask follow-up questions
- Example: "I've suggested X events for your week. Click 'Add to Calendar' on the ones you'd like to schedule, or let me know if you'd like me to adjust any times or add more activities."
- NEVER end your response immediately after the last JSON code block - always include closing text

Keep responses concise but actionable. Focus on practical, specific recommendations.`;

  try {
    const { model, useBYOK } = await getAIProvider(session.user.id);

    // Convert UIMessages to model messages format
    const modelMessages = await convertToModelMessages(uiMessages);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      // No maxTokens constraint - let the model return as much as needed
      // GPT-5.2 with reasoning effort 'none' supports temperature
      providerOptions: {
        openai: {
          reasoningEffort: 'none', // GPT-5.2: minimal reasoning for lower latency
          temperature: 0.1, // Low temperature for consistent, focused responses
        },
      },
      onFinish: async ({ usage }) => {
        // Only track usage if not using BYOK
        if (!useBYOK && usage) {
          const costCents = calculateCostCents(
            usage.inputTokens || 0,
            usage.outputTokens || 0,
            'gpt-5.2'
          );
          await trackLLMUsage(session.user.id, costCents);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Planning chat error:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

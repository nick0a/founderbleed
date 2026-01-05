# Phase 7: Planning Assistant

## Overview

Build the AI-powered Planning Assistant that helps users improve their calendar planning. This includes the chat interface, calendar view with planning scores, and calendar write integration for adding suggested events.

---

## Prerequisites

- Phase 6 complete (landing page working)
- Subscription gating in place (Planning is subscriber-only)
- Audit data available for context
- Calendar write scope upgrade mechanism ready

---

## Feature Gating

| User Type | Access |
|-----------|--------|
| Free | Paywall modal, no access |
| Starter | Full access |
| Pro | Full access |
| Enterprise | Full access |

---

## Database Schema

```typescript
// Planning sessions
export const planningSessions = pgTable('planning_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id),
  createdAt: timestamp('created_at').defaultNow(),
  sessionType: text('session_type').default('weekly'), // daily, weekly
  conversationHistory: jsonb('conversation_history').default([]),
  plannedEvents: jsonb('planned_events').default([]), // events to push to calendar
  status: text('status').default('active') // active, completed, cancelled
});
```

---

## AI Context Injection

When processing a message, inject this context:

```typescript
const systemPrompt = `You are a productivity coach helping founders optimize their calendar.
You have access to their audit results showing how they spend time.

User's Audit Data:
- Efficiency Score: ${efficiencyScore}%
- Planning Score: ${planningScore}%
- Hours by tier: Unique: ${unique}h, Founder: ${founder}h, Senior: ${senior}h, Junior: ${junior}h, EA: ${ea}h
- Top delegable tasks: ${topDelegableTasks.join(', ')}

When suggesting calendar changes:
- Be specific with times and durations
- Explain why each change helps
- Consider their role (mostly Unique/Founder work vs delegable)
- Suggest protecting time for high-value work
- Recommend delegating low-value tasks

You can suggest new events to add to their calendar.
Format event suggestions as structured data:
{
  "type": "event_suggestion",
  "title": "Focus: Product Strategy",
  "start": "2025-01-07T09:00:00",
  "end": "2025-01-07T12:00:00",
  "tier": "unique"
}
`;
```

---

## Chat Interface

### Layout Options
1. **Chat only** - Full-width chat
2. **Split view** - Chat left, calendar right

### Components
- Message input at bottom
- Conversation history scrolling up
- User messages right-aligned
- AI messages left-aligned
- Typing indicator while AI responding
- Suggested events rendered as cards

### Event Suggestion Cards

When AI suggests events:
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Focus: Product Strategy                                  │
│ Tuesday 9am - 12pm (3 hours)                                │
│ Tier: Unique                                                │
│                                                             │
│ [Add to Calendar]  [Dismiss]                                │
└─────────────────────────────────────────────────────────────┘
```

### Bulk Actions
- "Add All Suggestions" button when multiple suggestions

---

## Calendar View

### Week Grid
- 7 days visible
- Hours from 8am to 6pm (or 5pm)
- Week navigation (prev/next, "Today")

### Events Display
- Existing events on grid
- Color-coded by tier:
  - Unique: Purple
  - Founder: Blue
  - Senior: Green
  - Junior: Yellow
  - EA: Gray

### Per-Event Planning Scores
Badge on each event:
- 🟢 Green: ≥70%
- 🟡 Amber: ≥40% and <70%
- 🔴 Red: <40%

### Tier Legend
Below calendar showing color mapping

### Overall Planning Score
In calendar header: "Planning Score: 65%"

---

## Calendar Write Integration

### Scope Upgrade Flow

When user tries to add event without write access:

```
┌─────────────────────────────────────────────────────────────┐
│ Add Events to Your Calendar                                 │
├─────────────────────────────────────────────────────────────┤
│ To add events directly to your calendar, we need           │
│ permission to create events.                                │
│                                                             │
│ This allows the Planning Assistant to:                      │
│ ✓ Create new events based on your plan                     │
│ ✓ Add focus blocks and protected time                      │
│                                                             │
│ We will never modify or delete your existing events.       │
│                                                             │
│ [Grant Access]  [Cancel]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Add Event API

```typescript
// POST /api/calendar/events/create
export async function POST(request: NextRequest) {
  const session = await auth();
  const { title, startTime, endTime, description } = await request.json();

  // Check write access
  const connection = await getCalendarConnection(session.user.id);
  if (!connection.hasWriteAccess) {
    return NextResponse.json({ error: 'write_access_required' }, { status: 403 });
  }

  const calendar = await getCalendarClient(session.user.id);
  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      description
    }
  });

  return NextResponse.json({ eventId: event.data.id });
}
```

---

## Example AI Dialogue

```
AI: Based on your audit, you're spending 12 hours/week on tasks
    that could be delegated. Your Planning Score is 65% -
    there's room for improvement!

    What are your top 3 priorities for this week?

User: Launch new feature, prep investor deck, close 2 sales calls

AI: Great. Here's my suggested time blocking:

    📅 Tuesday 9am-1pm: Feature launch (Unique work)
    📅 Wednesday 2pm-5pm: Investor deck prep (Unique work)
    📅 Thursday 10am-12pm: Sales calls (Founder work)

    I noticed you have 6 hours of "Team Sync" meetings.
    Consider delegating meeting notes to your EA and
    reducing sync time to 2 hours.

    [Add All to Calendar]  [Customize]
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### PLAN-01: Free User Sees Paywall

**What to verify:**
- As free user, navigate to Planning Assistant

**Success criteria:**
- Paywall modal appears
- Chat interface NOT accessible
- Subscribe CTA prominent

### PLAN-02: Subscriber Sees Chat

**What to verify:**
- As subscribed user, navigate to Planning

**Success criteria:**
- Chat interface loads
- No paywall
- Message input functional

### PLAN-03: AI Responds Within 3 Seconds

**What to verify:**
- Send message: "Help me plan my week"
- Time until response starts

**Success criteria:**
- Response begins within 3 seconds
- Complete within 10 seconds
- No timeout errors

### PLAN-04: Context Injected

**What to verify:**
- Start session linked to audit
- Ask: "What's my efficiency score?"

**Success criteria:**
- AI knows efficiency score
- References actual audit data
- Provides relevant suggestions

### PLAN-05: Calendar View Shows Events

**What to verify:**
- Open calendar view

**Success criteria:**
- Events displayed on grid
- Color-coded by tier
- Week navigation works

### PLAN-06: Per-Event Planning Scores

**What to verify:**
- Look at events in calendar

**Success criteria:**
- Each event has score badge
- Color-coded (green/amber/red)
- Scores reflect planning quality

### PLAN-07: Event Suggestions Render

**What to verify:**
- Ask AI: "Schedule a 2-hour focus block tomorrow at 9am"

**Success criteria:**
- AI response includes suggestion
- Event card rendered with title, time, duration
- "Add to Calendar" button present

### PLAN-08: Add Without Write Scope

**What to verify:**
- With read-only scope, try to add event

**Success criteria:**
- Scope upgrade prompt appears
- Explains write access need
- Button to grant permissions

### PLAN-09: Add With Write Scope

**What to verify:**
- Grant write scope
- Click "Add to Calendar"

**Success criteria:**
- Event created in Google Calendar
- Confirmation shown
- Card updates to "Added"

### PLAN-10: Add All Works

**What to verify:**
- Get AI to suggest multiple events
- Click "Add All Suggestions"

**Success criteria:**
- All events created
- Confirmation shows count
- All cards update to "Added"

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Free users see paywall | Navigate as free user |
| Subscribers access chat | Full interface for paying users |
| AI responds quickly | <3 seconds to start |
| Context injected | AI knows audit data |
| Calendar view works | Events displayed, color-coded |
| Planning scores show | Per-event badges visible |
| Suggestions render | AI suggestions as cards |
| Scope upgrade prompts | Write access requested |
| Add event works | Creates Google Calendar event |
| Add all works | Bulk creation functional |

**Do not proceed to Phase 8 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 8: Dashboard & Automation**.

# Phase 8: Dashboard & Automation

## Overview

Build the subscriber dashboard with key metrics, trend tracking, and automated recurring audits. This phase creates the retention loop that keeps users engaged.

---

## Prerequisites

- Phase 7 complete (Planning Assistant working)
- Multiple audit runs possible per user
- Subscription system functional

---

## Dashboard Layout

### Navigation Logic
| User Type | Login Destination |
|-----------|-------------------|
| Subscriber | Dashboard |
| Free (with audit) | Results page |
| Free (no audit) | Processing page |

### Components

#### 1. Hero Stat Card
- **Large:** Efficiency Score
- **Trend arrow:** ↑ or ↓ vs last period
- **Percentage change**

#### 2. Secondary Stats Row
| Stat | Format |
|------|--------|
| Planning Score | "65%" (always with %) |
| Hours Reclaimed | "12 hrs/month" |
| $ Saved | "$2,400/month" |

#### 3. Top 3 Actions Panel
Rule-based recommendations:

| Condition | Action | Impact |
|-----------|--------|--------|
| EA hours > 5/week | "Hire an EA" | "Save X hrs/week" |
| Planning Score < 50 | "Improve calendar planning" | "Score is X%" |
| No audit in 30 days | "Run fresh audit" | "Last was X days ago" |
| Efficiency trending down | "Review time allocation" | "Down X% from last month" |
| Delegable hours > 10/week | "Hire [recommended role]" | "Save X hours/week" |

Each action:
- Title
- Description
- Impact metric
- Clickable (navigates to feature)

#### 4. This Week Preview
- Mini calendar showing current week
- Events color-coded by tier
- Click opens Planning Assistant

#### 5. Quick Actions Row
- "Run New Audit" button
- "Open Planning Assistant" button
- "View Recommendations" button

#### 6. Recent Audits List
- Last 5 audits
- Date, efficiency score, status
- Click to view results
- "Compare" button for each

#### 7. Contacts Leaderboard (if contacts exist)
- Top 3 contacts by efficiency
- "View All Contacts" link

#### 8. Subscribe Banner (free users only)
- "Unlock automated audits and AI planning"
- Subscribe CTA

---

## Comparison View

### Period Selector Options
- This week vs last week
- This month vs last month
- This quarter vs last quarter
- Custom date ranges

### Delta Calculations

| Metric | Display |
|--------|---------|
| Efficiency Score | "72% → 78% (+6%)" |
| Planning Score | "65% → 70% (+5%)" |
| Hours by Tier | Show change per tier |
| Arbitrage | "$X → $Y (+$Z)" |

### Visual
- Color code: Green for improvement, Red for decline
- Side-by-side or overlay charts

---

## Automated Audits

### Database Schema

```typescript
// Scheduled Audits
export const scheduledAudits = pgTable('scheduled_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  frequency: text('frequency'), // 'weekly', 'monthly', 'annual'
  dayOfWeek: integer('day_of_week').default(6), // 0=Sunday, 6=Saturday
  hour: integer('hour').default(3), // 3am
  timezone: text('timezone').default('UTC'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  enabled: boolean('enabled').default(true)
});

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type'), // 'audit_ready', 'subscription', 'contact_invite', 'system'
  title: text('title').notNull(),
  body: text('body'),
  link: text('link'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
});
```

### Schedule Logic

| Frequency | When | Covers |
|-----------|------|--------|
| Weekly | Saturday 3am (user tz) | Previous Sun-Sat |
| Monthly | 1st of month 3am | Previous month |
| Annual | Jan 1st 3am | Previous year |

### Leave Detection Skip
Before running scheduled audit:
1. Check if user has leave events covering entire period
2. If so, skip audit
3. Notify: "Audit skipped - you're on leave"
4. Reschedule to next period

### Notification Types

| Type | When | Content |
|------|------|---------|
| audit_ready | Audit completes | "Your audit is ready" → link to results |
| audit_skipped | Leave detected | "Audit skipped - you're on leave" |
| efficiency_drop | Significant decrease | "Your efficiency dropped X%" |

### Delivery Channels
- **In-app:** Bell icon with unread count
- **Email:** Based on user notification preferences

---

## Scheduler Implementation

Use Vercel Cron or similar:

```typescript
// api/cron/run-audits/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find due audits
  const dueAudits = await db.query.scheduledAudits.findMany({
    where: and(
      eq(scheduledAudits.enabled, true),
      lte(scheduledAudits.nextRunAt, new Date())
    )
  });

  for (const scheduled of dueAudits) {
    // Check for leave
    const hasLeave = await checkUserOnLeave(scheduled.userId, scheduled.frequency);
    if (hasLeave) {
      await skipAudit(scheduled);
      continue;
    }

    // Run audit
    await runScheduledAudit(scheduled);

    // Update next run
    await updateNextRunAt(scheduled);

    // Send notification
    await createNotification(scheduled.userId, 'audit_ready', ...);
  }

  return NextResponse.json({ processed: dueAudits.length });
}
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix and retry. After 5 failed attempts, ask the user.

### DASH-01: Subscriber Lands on Dashboard

**What to verify:**
- Sign in as subscribed user

**Success criteria:**
- Redirects to /dashboard
- All sections render
- No errors

### DASH-02: Free User Lands on Results

**What to verify:**
- Sign in as free user with completed audit

**Success criteria:**
- Redirects to /results/[auditId]
- Subscribe banner visible
- Not blocked from viewing

### DASH-03: Efficiency Trend Shows

**What to verify:**
- View dashboard with 2+ audits

**Success criteria:**
- Hero stat shows Efficiency Score
- Trend arrow (↑ or ↓)
- Percentage change displayed

### DASH-04: Top 3 Actions Relevant

**What to verify:**
- Check actions panel

**Success criteria:**
- 1-3 action cards displayed
- Each has title, description, impact
- Relevant to user's data
- Clickable and navigate

### DASH-05: This Week Preview

**What to verify:**
- Check mini calendar

**Success criteria:**
- Current week events shown
- Color-coded by tier
- Click opens Planning

### DASH-06: Recent Audits Listed

**What to verify:**
- Check recent audits section

**Success criteria:**
- Up to 5 recent audits
- Date and efficiency score
- Click navigates to results

### DASH-07: Comparison View Works

**What to verify:**
- Select "This week vs last week"

**Success criteria:**
- Both periods' metrics displayed
- Delta calculated and shown
- Green for improvements, red for declines

### DASH-08: Automated Audit Configurable

**What to verify:**
- Go to settings/dashboard
- Configure weekly audit

**Success criteria:**
- Can select frequency
- Can enable/disable
- Settings persist
- Next run date shown

### DASH-09: Automated Audit Runs

**What to verify:**
- Set up audit for immediate execution (or mock scheduler)
- Trigger scheduler

**Success criteria:**
- Audit created automatically
- Notification sent
- Next run date updated

### DASH-10: Audit Skipped During Leave

**What to verify:**
- Set leave covering audit period
- Trigger scheduler

**Success criteria:**
- Audit NOT run
- User notified of skip
- Reason: "on leave"

### DASH-11: Notifications Appear

**What to verify:**
- Trigger audit_ready notification
- Check bell icon

**Success criteria:**
- Bell shows unread count
- Click shows list
- Notification links to results
- Can mark as read

---

## Handoff Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Subscriber sees dashboard | Sign in → /dashboard |
| Free user sees results | Sign in → /results |
| Efficiency trend shows | Arrow and change visible |
| Top 3 Actions work | Relevant actions with impact |
| This Week Preview works | Mini calendar, color-coded |
| Recent audits listed | Clickable list |
| Comparison view works | Deltas calculated |
| Automated audits configurable | Can set schedule |
| Automated audits run | Scheduler creates audits |
| Leave skip works | Skipped during leave |
| Notifications work | Bell, list, mark as read |

**Do not proceed to Phase 9 until all tests pass.**

---

## Next Phase

Once all tests pass, proceed to **Phase 9: Settings & Contacts**.

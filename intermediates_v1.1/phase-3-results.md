# Phase 3: Results & Recommendations

## Overview

Build the results report page and role recommendation engine. This phase transforms audit data into 

1. actionable hiring recommendations with job descriptions
2. actionable suggestions for delegation to existing team members
3. actionable suggestions of how to better group tasks and plan work to deliver greater efficiency 

The results report page presents results in a compelling, shareable format.

---

## Prerequisites

- Phase 2 complete (audit engine working, metrics calculating)
- Events are classified into tiers
- Metrics are calculating without NaN values

---

## Integration References

Before implementing the email sharing features in this phase, review:

- **[integration-resend.md](./integration-resend.md)** - Complete Resend email integration guide including batch sending, React Email templates, and API route implementation for sharing reports.

---

## Role Clustering Algorithm

### Two-Dimensional Clustering

Roles are determined by:
1. **Tier** (seniority): Senior, Junior, or EA
2. **Business Area** (specialization): From keyword matching
3. **Vertical** (for Senior/Junior): Universal, Engineering or Business

### Minimum Hours Threshold

**Rule: 8 hours/week minimum for standalone role**

| Scenario | Action |
|----------|--------|
| Weekly hours ≥ 8 | Create specialized role for that business area + tier |
| Weekly hours < 8 | Add to "consolidation bucket" |

### Consolidation Bucket Logic

For sub-threshold clusters:
1. Group by tier (Senior bucket, Junior bucket, EA bucket)
2. Sum hours within each tier bucket
3. If bucket total ≥ 8 hrs → Create consolidated role
4. If bucket total < 8 hrs → Show as "Consider ad-hoc outsourcing"

**EA Tier Consolidation:** All EA tasks consolidate into single "Executive Assistant" role.

### Role Title Construction

| Tier | Vertical | Business Area | Role Title |
|------|----------|---------------|------------|
| Senior | Engineering | Development | Senior Developer |
| Senior | Engineering | Design | Senior Designer |
| Senior | Engineering | Data/Analytics | Senior Data Analyst |
| Senior | Business | Finance | Finance Manager |
| Senior | Business | Recruiting | Talent Lead |
| Senior | Business | Marketing | Marketing Manager |
| Senior | Business | Sales | Account Manager |
| Senior | Business | (Consolidated) | Operations Manager |
| Junior | Engineering | Development | Junior Developer |
| Junior | Engineering | (Consolidated) | Technical Coordinator |
| Junior | Business | (Any) | Business Coordinator |
| Junior | Business | (Consolidated) | Operations Coordinator |
| EA | (N/A) | (All) | Executive Assistant |

### Cost Calculation

```
Weekly Hours = Total Hours ÷ (Days in Audit Period ÷ 7)
Hours per Week = Round up to nearest whole number (8-40 range)

Weekly Cost = (Tier Rate ÷ 52) × (Hours per Week ÷ 40)
Monthly Cost = Weekly Cost × 4.33
Annual Cost = Tier Rate × (Hours per Week ÷ 40)
```

---

## Database Schema Additions

```typescript
// Role recommendations
export const roleRecommendations = pgTable('role_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  roleTitle: text('role_title').notNull(),
  roleTier: text('role_tier').notNull(), // senior, junior, ea
  vertical: text('vertical'), // engineering, business, null for EA
  businessArea: text('business_area').notNull(),
  hoursPerWeek: numeric('hours_per_week').notNull(),
  costWeekly: numeric('cost_weekly').notNull(),
  costMonthly: numeric('cost_monthly').notNull(),
  costAnnual: numeric('cost_annual').notNull(),
  jdText: text('jd_text'), // markdown
  tasksList: jsonb('tasks_list'), // [{task: string, hoursPerWeek: number}]
  createdAt: timestamp('created_at').defaultNow()
});
```

---

## Job Description Template

```markdown
# [Role Title]

**Employment Type:** Part-time ([X] hours/week) or Full-time (40 hours/week)
**Tier:** [Senior | Junior | EA]
**Vertical:** [Engineering | Business | N/A]
**Business Area:** [Area]
**Estimated Cost:** $[X]/week | $[Y]/month | $[Z]/year

## Tasks You'll Take Over
*Based on your calendar audit*

- [Task 1 from event titles] ([X] hours/week)
- [Task 2 from event titles] ([Y] hours/week)
- [Task 3 from event titles] ([Z] hours/week)

## Key Responsibilities

[Derived from aggregated event titles in this cluster]

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## Required Skills

[Based on business area and vertical]

## Ideal Candidate Profile

[Generic for area + tier + vertical]
```

---

## Results Page Components

### 1. Personalized Header
- **Editable username field** (persists to localStorage)
- "Audit for [Username]" with date range
- Hero metric: **"{Username}, You're Losing $X Every Year..."**
- If no salary: "Set compensation to view costs"

### 2. Summary Cards Row
| Card | Content |
|------|---------|
| Annual Arbitrage | `$XX,XXX` or "Set compensation" |
| Reclaimable Hours | `X hrs/week` |
| Efficiency Score | `XX%` |
| Planning Score | `XX%` (always with % symbol) |

### 3. Tier Breakdown Chart
- **Title:** "How you spend your time on tasks that you can uniquely do vs those you can delegate"
- Visual chart showing hours by tier
- Color-coded by tier
- Percentages labeled

### 4. Event Table
- Sortable by: date, duration, tier
- Columns: Title, Date, Duration, Tier (dropdown), Reconcile (button)
- Inline tier editing via dropdown
- Green checkmark "Reconcile" button per row
- Changes trigger metric recalculation

### 5. "Delegate to Your Team" Section
*Only show if user has existing team members*

**Logic Override:** If existing team members match a recommended role tier/vertical (e.g. you have a Junior Engineer and the system recommends hiring a Junior Developer), **suppress** the hiring recommendation and instead feature it heavily in this "Delegate to Your Team" section.

| Role | Team Count | Tasks to Delegate | Potential Savings |
|------|------------|-------------------|-------------------|
| EA | 1 | Scheduling, expenses | 8 hrs/week, $X/month |

### 6. "AI-Powered Automation" Section
- AI SDR: automatable sales tasks, weekly savings
- AI Writer: content tasks, weekly savings
- 2-column grid with Bot/Sparkles icons

### 7. Role Recommendations Section
- Card for each recommended role
- Expandable job description
- **Drag-and-drop only when 2+ roles**
- Copy JD button

### 8. Share Results Section
Located at the bottom of the results page, before the Subscribe CTA.

#### Email Sharing Component
Multi-email input field for sending results directly to recipients:

**Behavior:**
- Text input field with placeholder "Enter email addresses..."
- When user types an email and presses **Space**, the email becomes a tag/chip
- Tags are displayed inline with an "x" to remove
- User can continue adding more emails (repeat space to add)
- When user presses **Enter**, send the report to all tagged email addresses
- Show loading state while sending
- Show success toast: "Report sent to X recipients"
- Clear all tags after successful send
- Validate email format before creating tag (show error for invalid emails)

**UI Specifications:**
```
┌─────────────────────────────────────────────────────────────┐
│ Share Your Results                                          │
├─────────────────────────────────────────────────────────────┤
│ Send to colleagues:                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [john@co.com ×] [sarah@co.com ×] [type here...]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Press Space to add, Enter to send                           │
│                                                             │
│ Or share via:                                               │
│ [LinkedIn] [Twitter/X] [Copy Link]                          │
└─────────────────────────────────────────────────────────────┘
```

#### Social Media Sharing Links
- **LinkedIn:** Pre-populated post with audit summary and link
- **Twitter/X:** Pre-populated tweet with headline metric and link
- **Copy Link:** Generates shareable URL and copies to clipboard

**Pre-populated Social Content:**
- LinkedIn: "I just discovered I'm losing ${heroMetric}/year on work I should be delegating. Check out Founder Bleed to audit your calendar. [link]"
- Twitter/X: "🩸 ${heroMetric}/year bleeding out on delegatable work. Time for a calendar triage. [link]"

---

## Drag-and-Drop Rules

| Condition | Behavior |
|-----------|----------|
| 1 role | No drag handles, no drag messaging |
| 2+ roles | Drag handles visible, can reorder roles |
| Task drag | Tasks can be moved between roles |

When tasks are moved:
- Recalculate hours and costs for affected roles
- Update JD task lists

---

## Build Instructions

### 3.1 Role Clustering Service

Create `src/lib/role-clustering.ts`:

```typescript
export interface RoleRecommendation {
  roleTitle: string;
  roleTier: 'senior' | 'junior' | 'ea';
  vertical: 'engineering' | 'business' | null;
  businessArea: string;
  hoursPerWeek: number;
  costWeekly: number;
  costMonthly: number;
  costAnnual: number;
  tasks: { task: string; hoursPerWeek: number }[];
}

export function generateRoleRecommendations(
  events: { title: string; finalTier: string; businessArea: string; vertical: string; durationMinutes: number }[],
  auditDays: number,
  tierRates: { senior: number; junior: number; ea: number }
): RoleRecommendation[] {
  // Filter to delegable tiers
  const delegable = events.filter(e => ['senior', 'junior', 'ea'].includes(e.finalTier));

  // Group by tier + businessArea
  const clusters = new Map<string, typeof delegable>();
  for (const event of delegable) {
    const key = `${event.finalTier}:${event.businessArea}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(event);
  }

  // Calculate weekly hours per cluster
  const weeklyMultiplier = 7 / auditDays;
  const recommendations: RoleRecommendation[] = [];
  const consolidationBuckets: Record<string, typeof delegable> = { senior: [], junior: [], ea: [] };

  for (const [key, clusterEvents] of clusters) {
    const [tier, businessArea] = key.split(':');
    const totalHours = clusterEvents.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= 8) {
      // Create specialized role
      recommendations.push(createRole(tier, businessArea, clusterEvents, weeklyHours, tierRates));
    } else {
      // Add to consolidation bucket
      consolidationBuckets[tier].push(...clusterEvents);
    }
  }

  // Process consolidation buckets
  for (const [tier, bucketEvents] of Object.entries(consolidationBuckets)) {
    if (bucketEvents.length === 0) continue;
    const totalHours = bucketEvents.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= 8) {
      recommendations.push(createRole(tier, 'Consolidated', bucketEvents, weeklyHours, tierRates));
    }
  }

  // Sort by hours descending
  recommendations.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  // Limit to 5 roles max
  if (recommendations.length > 5) {
    // Combine lowest into last
    // ... implementation
  }

  return recommendations;
}

function createRole(tier: string, businessArea: string, events: any[], weeklyHours: number, tierRates: any): RoleRecommendation {
  const vertical = tier === 'ea' ? null : events[0]?.vertical || 'business';
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const rate = tier === 'ea' ? tierRates.ea :
               tier === 'senior' ? tierRates.senior : tierRates.junior;

  const hoursPerWeek = Math.ceil(weeklyHours);
  const costAnnual = rate * (hoursPerWeek / 40);
  const costWeekly = costAnnual / 52;
  const costMonthly = costWeekly * 4.33;

  // Aggregate tasks
  const taskMap = new Map<string, number>();
  const weeklyMultiplier = 7 / events.length; // simplified
  for (const event of events) {
    const hours = (event.durationMinutes / 60) * weeklyMultiplier;
    const existing = taskMap.get(event.title) || 0;
    taskMap.set(event.title, existing + hours);
  }

  const tasks = Array.from(taskMap.entries())
    .map(([task, hours]) => ({ task, hoursPerWeek: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
    .slice(0, 10);

  return {
    roleTitle,
    roleTier: tier as 'senior' | 'junior' | 'ea',
    vertical: vertical as 'engineering' | 'business' | null,
    businessArea,
    hoursPerWeek,
    costWeekly: Math.round(costWeekly),
    costMonthly: Math.round(costMonthly),
    costAnnual: Math.round(costAnnual),
    tasks
  };
}

function generateRoleTitle(tier: string, vertical: string | null, businessArea: string): string {
  // ... title generation logic per table above
}
```

### 3.2 Results Page

Create `src/app/(dashboard)/results/[id]/page.tsx`:

Key components:
- Username editor with localStorage persistence
- Hero metric with conditional display
- Summary cards
- Charts
- Event table with inline editing
- Role recommendations with drag-drop (when 2+ roles)
- Share results section
- Subscribe CTA (free users)

### 3.3 Multi-Email Input Component

Create `src/components/multi-email-input.tsx`:

```typescript
interface MultiEmailInputProps {
  onSend: (emails: string[]) => Promise<void>;
  disabled?: boolean;
}

export function MultiEmailInput({ onSend, disabled }: MultiEmailInputProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' && inputValue.trim()) {
      e.preventDefault();
      const email = inputValue.trim();
      if (isValidEmail(email)) {
        if (!emails.includes(email)) {
          setEmails([...emails, email]);
        }
        setInputValue('');
        setError(null);
      } else {
        setError('Invalid email format');
      }
    }

    if (e.key === 'Enter' && emails.length > 0) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(emails);
      setEmails([]);
      toast.success(`Report sent to ${emails.length} recipient(s)`);
    } catch (err) {
      toast.error('Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  return (
    // ... JSX with tags display, input, and send button
  );
}
```

### 3.4 Social Share Links Component

Create `src/components/social-share-links.tsx`:

```typescript
interface SocialShareLinksProps {
  shareUrl: string;
  heroMetric: string; // e.g., "$127,000"
}

export function SocialShareLinks({ shareUrl, heroMetric }: SocialShareLinksProps) {
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterText = `🩸 ${heroMetric}/year bleeding out on delegatable work. Time for a calendar triage.`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
          <LinkedInIcon /> LinkedIn
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
          <TwitterIcon /> Twitter/X
        </a>
      </Button>
      <Button variant="outline" onClick={copyLink}>
        <LinkIcon /> Copy Link
      </Button>
    </div>
  );
}
```

### 3.5 Send Report API Endpoint

Create `src/app/api/share/send-report/route.ts`:

```typescript
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { auditId, emails } = await request.json();

  // Validate emails
  for (const email of emails) {
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
  }

  // Generate share token if not exists
  const shareToken = await getOrCreateShareToken(auditId);
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareToken}`;

  // Send emails via Resend
  for (const email of emails) {
    await resend.emails.send({
      from: 'Founder Bleed <noreply@founderbleed.com>',
      to: email,
      subject: `${session.user.name} shared their calendar audit with you`,
      html: generateShareEmailTemplate({ shareUrl, senderName: session.user.name })
    });

    // Store as lead
    await storeEmailLead(email, shareToken);
  }

  return NextResponse.json({ success: true, sentCount: emails.length });
}
```

---

## Test Instructions

**Retry Policy:** If a test fails, fix the issue and retry. After 5 failed attempts on the same test, stop and ask the user for guidance.

### RESULTS-01: Results Page Renders

**What to verify:**
- Navigate to `/results/[auditId]`
- Page loads without errors

**Success criteria:**
- No console errors
- No "undefined" or "NaN" visible
- All sections render

### RESULTS-02: Username is Editable

**What to verify:**
- Click on username field
- Type a new name
- Refresh the page

**Success criteria:**
- Username is editable inline
- New name persists after refresh (localStorage)
- Hero metric updates: "{NewName}, You're Losing..."

### RESULTS-03: No Salary Shows Message

**What to verify:**
- View results for user with no salary set

**Success criteria:**
- Does NOT show "$0" or "NaN"
- Shows "Set compensation to view costs"
- Arbitrage section handles null gracefully

### RESULTS-04: Planning Score Shows Percentage

**What to verify:**
- Check the Planning Score display

**Success criteria:**
- Shows "42%" not "42"
- Includes % symbol
- Value between 0% and 100%

### RESULTS-05: Tier Dropdown Updates Metrics

**What to verify:**
- Change an event's tier using inline dropdown
- Observe summary metrics

**Success criteria:**
- Metrics update in real-time
- Hours by tier change
- No page refresh required

### RESULTS-06: Single Role Hides Drag-Drop

**What to verify:**
- View results with only 1 role recommendation

**Success criteria:**
- No drag handles visible
- No drag text
- Role card displays normally

### RESULTS-07: Multiple Roles Enable Drag-Drop

**What to verify:**
- View results with 2+ role recommendations
- Try dragging a role card

**Success criteria:**
- Drag handles visible
- Roles can be reordered
- Order persists

### RESULTS-08: Job Description Copyable

**What to verify:**
- Expand a role's job description
- Click copy button

**Success criteria:**
- JD copies to clipboard
- Format preserved
- "Tasks You'll Take Over" included with hours

### RESULTS-09: Reconcile Button Works

**What to verify:**
- Click green checkmark on event row

**Success criteria:**
- Event marked as reconciled
- Visual indication shown
- Progress tracked

### RESULTS-10: Multi-Email Input Works

**What to verify:**
- Find the "Share Your Results" section
- Type an email address and press Space
- Type another email and press Space
- Press Enter to send

**Success criteria:**
- Email becomes a tag/chip when Space is pressed
- Invalid emails show error message
- Multiple tags can be added
- Tags have "x" button to remove
- Enter sends to all tagged emails
- Loading state shown while sending
- Success toast: "Report sent to X recipients"
- Tags clear after successful send

### RESULTS-11: Email Validation Works

**What to verify:**
- Type invalid email (e.g., "notanemail") and press Space
- Type valid email and press Space

**Success criteria:**
- Invalid email shows error, no tag created
- Valid email creates tag
- Duplicate emails are ignored (no duplicate tags)

### RESULTS-12: Social Share Links Work

**What to verify:**
- Click LinkedIn share button
- Click Twitter/X share button
- Click Copy Link button

**Success criteria:**
- LinkedIn opens share dialog with pre-populated content
- Twitter opens tweet composer with hero metric and link
- Copy Link copies URL to clipboard with success toast
- All links include the shareable report URL

---

## Handoff Requirements

Phase 3 is complete when ALL of the following are true:

| Requirement | How to Verify |
|-------------|---------------|
| Results page loads | Navigate to /results/[id], no errors |
| Username editable | Edit and refresh, persists |
| Null salary handled | No $0 or NaN, shows message |
| Planning Score shows % | "42%" not "42" |
| Inline tier editing works | Dropdown changes trigger recalc |
| Role recommendations generate | At least one role shown |
| Single role hides drag | No drag handles with 1 role |
| Multiple roles enable drag | Drag handles with 2+ roles |
| JDs are copyable | Copy works, format preserved |
| Reconcile button works | Checkmark marks event |
| Multi-email input works | Space adds tag, Enter sends |
| Email validation | Invalid emails rejected |
| Social share links | LinkedIn, Twitter/X, Copy Link work |

**Do not proceed to Phase 4 until all tests pass and all handoff requirements are met.**

---

## User Review & Verification

**⏸️ STOP: User review required before proceeding to the next phase.**

The agent has completed this phase. Before continuing, please verify the build yourself.

### Manual Testing Checklist

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Results page loads | Navigate to `/results/[auditId]` | Page renders with metrics, charts, and recommendations |
| 2 | Username editable | Click on username field, change it, refresh | New name persists, hero metric shows "{YourName}, You're Losing..." |
| 3 | Planning Score shows % | Check the Planning Score card | Shows "65%" not "65" (always with % symbol) |
| 4 | Tier dropdown works | Change an event's tier in the table | Metrics update in real-time without page refresh |
| 5 | Role recommendations | Scroll to recommendations section | At least one role card with job description visible |
| 6 | No salary = no NaN | If salary not set, check Arbitrage card | Shows "Set compensation to view costs", not "$0" or "NaN" |
| 7 | Multi-email input | Type email, press Space, repeat, press Enter | Emails become tags, Enter sends report to all recipients |
| 8 | Social share links | Click LinkedIn, Twitter/X, Copy Link buttons | Opens share dialogs with pre-populated content, copy shows toast |

### What to Look For

- All summary cards display valid data
- Tier breakdown chart shows colored segments
- Event table is sortable and filterable
- Green checkmark reconcile buttons (not checkboxes)
- Job descriptions include "Tasks You'll Take Over" with hours
- Share section visible with email input and social buttons
- Email tags display inline with remove buttons

### Known Limitations at This Stage

- No onboarding flow yet (coming in Phase 4)
- User must manually navigate to results page
- No subscription/paywall yet

### Proceed to Next Phase

Once you've verified the above, instruct the agent:

> "All Phase 3 tests pass. Proceed to Phase 4: Onboarding Flow."

If issues were found:

> "Phase 3 issue: [describe problem]. Please fix before proceeding."

---

## Next Phase

Once all tests pass, proceed to **Phase 4: Onboarding Flow**.

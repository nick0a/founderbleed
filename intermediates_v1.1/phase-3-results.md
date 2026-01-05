# Phase 3: Results & Recommendations

## Overview

Build the results report page and role recommendation engine. This phase transforms audit data into actionable hiring recommendations with job descriptions, and presents results in a compelling, shareable format.

---

## Prerequisites

- Phase 2 complete (audit engine working, metrics calculating)
- Events are classified into tiers
- Metrics are calculating without NaN values

---

## Role Clustering Algorithm

### Two-Dimensional Clustering

Roles are determined by:
1. **Tier** (seniority): Senior, Junior, or EA
2. **Business Area** (specialization): From keyword matching
3. **Vertical** (for Senior/Junior): Engineering or Business

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
- Subscribe CTA (free users)

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

**Do not proceed to Phase 4 until all tests pass and all handoff requirements are met.**

---

## Next Phase

Once all tests pass, proceed to **Phase 4: Onboarding Flow**.

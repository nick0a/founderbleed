# Phase 2: Audit Engine

## Overview

Build the core audit engine that ingests calendar events, classifies them into tiers, detects leave periods, and calculates efficiency metrics. This is the analytical heart of the product.

---

## Prerequisites

- Phase 1 complete (authentication and calendar APIs working)
- User can sign in and fetch calendar events
- Database schema for users and calendar connections exists

---

## Database Schema Additions

Add to `src/lib/db/schema.ts`:

```typescript
// Audit runs
export const auditRuns = pgTable('audit_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  dateStart: timestamp('date_start', { mode: 'date' }).notNull(),
  dateEnd: timestamp('date_end', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  calendarsIncluded: text('calendars_included').array(),
  exclusionsUsed: text('exclusions_used').array(),
  computedMetrics: jsonb('computed_metrics'),
  planningScore: integer('planning_score'), // 0-100
  planningAssessment: text('planning_assessment'), // markdown
  status: text('status').default('pending'), // pending, processing, completed, failed
  algorithmVersion: text('algorithm_version').default('1.7').notNull(),
  leaveDaysDetected: integer('leave_days_detected').default(0),
  leaveHoursExcluded: numeric('leave_hours_excluded').default('0'),
  frequency: text('frequency').default('manual') // manual, weekly, monthly, annual
});

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditRunId: uuid('audit_run_id').references(() => auditRuns.id, { onDelete: 'cascade' }),
  externalEventId: text('external_event_id'),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  durationMinutes: integer('duration_minutes'),
  isAllDay: boolean('is_all_day').default(false),
  calendarId: text('calendar_id'),
  title: text('title'), // encrypted
  description: text('description'), // encrypted
  attendeesCount: integer('attendees_count').default(0),
  hasMeetLink: boolean('has_meet_link').default(false),
  isRecurring: boolean('is_recurring').default(false),

  // Classification
  suggestedTier: text('suggested_tier'), // unique, founder, senior, junior, ea
  finalTier: text('final_tier'),
  reconciled: boolean('reconciled').default(false),
  businessArea: text('business_area'),
  vertical: text('vertical'), // engineering, business
  confidenceScore: text('confidence_score'), // high, medium, low
  keywordsMatched: text('keywords_matched').array(),

  // Leave detection
  isLeave: boolean('is_leave').default(false),
  leaveDetectionMethod: text('leave_detection_method'),
  leaveConfidence: text('leave_confidence'), // high, medium, low

  // Planning
  planningScore: integer('planning_score'), // 0-100 per event

  createdAt: timestamp('created_at').defaultNow()
});
```

---

## Classification System

### The 5-Tier Model

| Tier | Description | When to Assign |
|------|-------------|----------------|
| **Unique** | Only this founder can do it | Strategic vision, key investor relationships, board presentations |
| **Founder** | Needs founder judgment but co-founder could handle | Interviewing senior hires, vendor negotiations |
| **Senior** | Skilled specialist work | Architecture reviews, client meetings, project planning |
| **Junior** | Entry-level work | Code reviews, documentation, testing, bug fixes |
| **EA** | Administrative work | Scheduling, travel, expenses, calendar management |

### Solo Founder Logic

**CRITICAL:** If `user.teamComposition.founder === 1`, hide "Founder" tier:
- Don't show Founder option in dropdowns
- Events that would classify as "Founder" become "Unique"
- Only display 4 tiers: Unique, Senior, Junior, EA

### Keyword-Based Classification

Create `src/lib/classification.ts`:

```typescript
// Business Area Keywords (case-insensitive, partial match)
export const BUSINESS_AREA_KEYWORDS = {
  'Strategy/Vision': ['strategy', 'vision', 'roadmap', 'planning', 'OKR', 'goals', 'priorities', 'direction', 'mission'],
  'Fundraising': ['investor', 'pitch', 'fundraising', 'due diligence', 'term sheet', 'cap table', 'board', 'VC', 'deck'],
  'Executive Hiring': ['executive', 'C-level', 'VP', 'director', 'leadership', 'senior hire', 'founder'],
  'Key Relationships': ['partner CEO', 'investor meeting', 'board member', 'advisor', 'mentor'],
  'Product': ['roadmap', 'feature', 'user story', 'sprint', 'backlog', 'requirements', 'PRD', 'spec', 'prioritization'],
  'Design': ['figma', 'design', 'UI', 'UX', 'mockup', 'wireframe', 'prototype', 'user research', 'usability'],
  'Development': ['code', 'bug', 'feature', 'PR', 'git', 'deploy', 'testing', 'QA', 'technical', 'programming', 'architecture'],
  'Sales': ['sales', 'pitch', 'proposal', 'deal', 'prospect', 'lead', 'demo', 'closing', 'pipeline', 'outreach', 'CRM'],
  'Marketing': ['content', 'blog', 'social', 'campaign', 'SEO', 'ads', 'brand', 'copywriting', 'newsletter', 'launch'],
  'Customer Success': ['support', 'customer', 'ticket', 'onboarding', 'retention', 'churn', 'feedback', 'NPS', 'renewal'],
  'Partnerships': ['partnership', 'integration', 'API', 'channel', 'reseller', 'affiliate', 'co-marketing', 'BD'],
  'Data/Analytics': ['dashboard', 'metrics', 'KPI', 'analytics', 'reporting', 'data', 'SQL', 'tableau', 'amplitude'],
  'Finance': ['invoice', 'expense', 'payroll', 'accounting', 'budget', 'billing', 'taxes', 'xero', 'quickbooks'],
  'Legal/Admin': ['contract', 'NDA', 'terms', 'compliance', 'agreement', 'legal', 'policy', 'documentation'],
  'Recruiting Ops': ['resume', 'sourcing', 'scheduling interview', 'applicant', 'ATS', 'job posting', 'screening'],
  'Operations': ['scheduling', 'admin', 'travel', 'calendar', 'logistics', 'office', 'supplies', 'errands', 'facilities'],
  'Community': ['discord', 'slack community', 'forum', 'documentation', 'tutorial', 'FAQ', 'help center']
};

// Tier Keywords
export const TIER_KEYWORDS = {
  unique: ['board', 'investor', 'fundraise', 'strategic', 'vision', 'deep work', 'architecture', 'strategy'],
  founder: ['leadership', 'executive', 'strategy', 'hiring senior', 'partner CEO', 'advisor'],
  senior: ['architecture', 'technical review', 'project planning', 'client meeting', 'code review'],
  junior: ['code review', 'bug fix', 'documentation', 'testing', 'QA'],
  ea: ['scheduling', 'travel', 'expenses', 'admin', 'calendar', 'invoice', 'payroll', 'receipts']
};

// Vertical Classification (Senior/Junior only)
export const ENGINEERING_AREAS = ['Development', 'Design', 'Data/Analytics'];
// All other areas = Business

export function classifyEvent(title: string, description: string, attendeesCount: number, isSoloFounder: boolean) {
  const text = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // Find business area
  let businessArea = 'Operations'; // default
  for (const [area, keywords] of Object.entries(BUSINESS_AREA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        businessArea = area;
        matchedKeywords.push(keyword);
        break;
      }
    }
    if (matchedKeywords.length > 0) break;
  }

  // Determine vertical (for Senior/Junior)
  const vertical = ENGINEERING_AREAS.includes(businessArea) ? 'engineering' : 'business';

  // Determine tier
  let suggestedTier = 'senior'; // default
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // Check tier keywords
  for (const [tier, keywords] of Object.entries(TIER_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        suggestedTier = tier;
        matchedKeywords.push(keyword);
        break;
      }
    }
  }

  // Heuristics
  if (attendeesCount >= 5) {
    suggestedTier = isSoloFounder ? 'unique' : 'founder';
    confidence = 'low'; // heuristic-based
  }

  // Confidence scoring
  if (matchedKeywords.length >= 3) confidence = 'high';
  else if (matchedKeywords.length >= 1) confidence = 'medium';
  else confidence = 'low';

  // Solo founder adjustment
  if (isSoloFounder && suggestedTier === 'founder') {
    suggestedTier = 'unique';
  }

  return {
    suggestedTier,
    businessArea,
    vertical,
    confidence,
    keywordsMatched: matchedKeywords
  };
}
```

---

## Leave Period Detection

Create `src/lib/leave-detection.ts`:

```typescript
// Leave Detection Keywords (case-insensitive)
export const LEAVE_KEYWORDS = {
  vacation: ['vacation', 'holiday', 'annual leave', 'PTO', 'paid time off'],
  outOfOffice: ['OOO', 'out of office', 'away', 'traveling', 'travel day'],
  leaveTypes: ['sick leave', 'sick day', 'personal day', 'bereavement', 'parental leave', 'maternity', 'paternity'],
  blockedTime: ['time off', 'day off', 'off work', 'not working', 'unavailable']
};

export function detectLeave(
  title: string,
  description: string,
  isAllDay: boolean,
  eventType?: string // 'outOfOffice', 'focusTime', etc.
): { isLeave: boolean; method: string; confidence: 'high' | 'medium' | 'low' } {
  const text = `${title} ${description}`.toLowerCase();

  // Method A: Google Calendar event type
  if (eventType === 'outOfOffice') {
    return { isLeave: true, method: 'google_event_type', confidence: 'high' };
  }

  // Method B: Keyword matching
  const allKeywords = Object.values(LEAVE_KEYWORDS).flat();
  const hasKeyword = allKeywords.some(kw => text.includes(kw.toLowerCase()));

  // High confidence: keyword + title match for "vacation" or "PTO"
  if (title.toLowerCase().includes('vacation') || title.toLowerCase().includes('pto')) {
    return { isLeave: true, method: 'keyword_title', confidence: 'high' };
  }

  // Medium confidence: other keywords or all-day with keyword
  if (hasKeyword) {
    const confidence = isAllDay ? 'medium' : 'medium';
    return { isLeave: true, method: 'keyword_match', confidence };
  }

  // Low confidence: pattern-based (all-day multi-day without keywords)
  // This would require looking at surrounding events - handle in processing

  return { isLeave: false, method: 'none', confidence: 'low' };
}
```

---

## Metrics Calculation

Create `src/lib/metrics.ts`:

```typescript
export interface AuditMetrics {
  totalHours: number;
  workingDays: number;
  hoursByTier: {
    unique: number;
    founder: number;
    senior: number;
    junior: number;
    ea: number;
  };
  founderCostTotal: number | null;
  delegatedCostTotal: number | null;
  arbitrage: number | null;
  efficiencyScore: number;
  reclaimableHours: number;
}

interface UserRates {
  salaryAnnual: number | null;
  equityPercentage: number | null;
  companyValuation: number | null;
  vestingPeriodYears: number | null;
  seniorEngineeringRate: number;
  seniorBusinessRate: number;
  juniorEngineeringRate: number;
  juniorBusinessRate: number;
  eaRate: number;
}

interface Event {
  durationMinutes: number;
  finalTier: string;
  vertical: string;
  isLeave: boolean;
}

export function calculateMetrics(events: Event[], userRates: UserRates, auditDays: number): AuditMetrics {
  // Filter out leave events
  const workEvents = events.filter(e => !e.isLeave);

  // Calculate hours by tier
  const hoursByTier = {
    unique: 0,
    founder: 0,
    senior: 0,
    junior: 0,
    ea: 0
  };

  for (const event of workEvents) {
    const hours = event.durationMinutes / 60;
    const tier = event.finalTier || 'senior';
    if (tier in hoursByTier) {
      hoursByTier[tier as keyof typeof hoursByTier] += hours;
    }
  }

  const totalHours = Object.values(hoursByTier).reduce((a, b) => a + b, 0);
  const workingDays = Math.max(auditDays, 1);

  // Calculate founder cost
  let founderCostTotal: number | null = null;
  if (userRates.salaryAnnual !== null) {
    let annualFounderCost = userRates.salaryAnnual;

    // Add equity value if provided
    if (
      userRates.equityPercentage !== null &&
      userRates.companyValuation !== null &&
      userRates.vestingPeriodYears !== null &&
      userRates.vestingPeriodYears > 0
    ) {
      const equityValue = (userRates.companyValuation * userRates.equityPercentage / 100) / userRates.vestingPeriodYears;
      annualFounderCost += equityValue;
    }

    const hourlyRate = annualFounderCost / 2080;
    founderCostTotal = hourlyRate * totalHours;
  }

  // Calculate delegated cost
  const seniorHours = hoursByTier.senior;
  const juniorHours = hoursByTier.junior;
  const eaHours = hoursByTier.ea;

  // Use average of engineering/business rates for simplicity
  // In practice, you'd use the event's vertical to determine which rate
  const seniorRate = (userRates.seniorEngineeringRate + userRates.seniorBusinessRate) / 2 / 2080;
  const juniorRate = (userRates.juniorEngineeringRate + userRates.juniorBusinessRate) / 2 / 2080;
  const eaRate = userRates.eaRate / 2080;

  const delegatedCostTotal = (seniorHours * seniorRate) + (juniorHours * juniorRate) + (eaHours * eaRate);

  // Calculate arbitrage
  let arbitrage: number | null = null;
  if (founderCostTotal !== null) {
    arbitrage = founderCostTotal - delegatedCostTotal;
  }

  // Efficiency score: % of time on Unique + Founder work
  const highValueHours = hoursByTier.unique + hoursByTier.founder;
  const efficiencyScore = totalHours > 0
    ? Math.round((highValueHours / totalHours) * 100)
    : 0;

  // Reclaimable hours (delegable work per week)
  const weeklyHours = totalHours / (auditDays / 7);
  const reclaimableHours = ((hoursByTier.senior + hoursByTier.junior + hoursByTier.ea) / totalHours) * weeklyHours;

  return {
    totalHours,
    workingDays,
    hoursByTier,
    founderCostTotal,
    delegatedCostTotal,
    arbitrage,
    efficiencyScore,
    reclaimableHours: Math.round(reclaimableHours * 10) / 10
  };
}
```

---

## Planning Score Calculation

Create `src/lib/planning-score.ts`:

```typescript
export interface PlanningScoreResult {
  score: number; // 0-100
  components: {
    eventCoverage: number;      // 25%
    titleQuality: number;       // 25%
    durationAccuracy: number;   // 25%
    recurringUsage: number;     // 15%
    descriptionQuality: number; // 10%
  };
  assessment: string; // markdown
}

interface Event {
  title: string;
  description: string;
  durationMinutes: number;
  isRecurring: boolean;
  isAllDay: boolean;
}

const VAGUE_TITLES = ['call', 'meeting', 'chat', 'sync', 'catch up', 'touch base', 'check in', 'TBD', 'busy'];

export function calculatePlanningScore(events: Event[], auditDays: number): PlanningScoreResult {
  if (events.length === 0) {
    return {
      score: 0,
      components: { eventCoverage: 0, titleQuality: 0, durationAccuracy: 0, recurringUsage: 0, descriptionQuality: 0 },
      assessment: '## Your Planning Score: 0%\n\nNo events found in the selected period.'
    };
  }

  // Event Coverage (25%): % of 40hr/week with scheduled events
  const totalHours = events.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
  const expectedHours = (auditDays / 7) * 40;
  const eventCoverage = Math.min(100, (totalHours / expectedHours) * 100);

  // Title Quality (25%): % of events with descriptive titles (>3 words, not vague)
  const descriptiveTitles = events.filter(e => {
    const words = e.title.trim().split(/\s+/).length;
    const isVague = VAGUE_TITLES.some(v => e.title.toLowerCase().includes(v));
    return words > 3 && !isVague;
  });
  const titleQuality = (descriptiveTitles.length / events.length) * 100;

  // Duration Accuracy (25%): % of events with realistic durations (15min - 4hrs)
  const realisticDurations = events.filter(e =>
    !e.isAllDay && e.durationMinutes >= 15 && e.durationMinutes <= 240
  );
  const durationAccuracy = (realisticDurations.length / events.length) * 100;

  // Recurring Usage (15%): % of recurring events
  const recurringEvents = events.filter(e => e.isRecurring);
  const recurringUsage = (recurringEvents.length / events.length) * 100;

  // Description Quality (10%): % of events with descriptions
  const withDescriptions = events.filter(e => e.description && e.description.length > 10);
  const descriptionQuality = (withDescriptions.length / events.length) * 100;

  // Calculate weighted score
  const score = Math.round(
    (eventCoverage * 0.25) +
    (titleQuality * 0.25) +
    (durationAccuracy * 0.25) +
    (recurringUsage * 0.15) +
    (descriptionQuality * 0.10)
  );

  // Generate assessment
  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  if (recurringUsage > 50) strengths.push(`Good use of recurring events (${Math.round(recurringUsage)}% of meetings are recurring)`);
  if (titleQuality > 70) strengths.push('Most events have descriptive titles');
  if (descriptionQuality > 50) strengths.push('Good use of event descriptions and agendas');

  if (eventCoverage < 50) improvements.push(`Only ${Math.round(eventCoverage)}% of your work hours have scheduled events`);
  const vagueCount = events.length - descriptiveTitles.length;
  if (vagueCount > 0) improvements.push(`${vagueCount} events have vague titles like "Call" or "Meeting"`);
  if (descriptionQuality < 30) improvements.push('Consider adding agendas to your meetings');

  if (eventCoverage < 50) recommendations.push('Block time for deep work (consider adding "focus time" blocks)');
  if (titleQuality < 70) recommendations.push('Add context to meeting titles (who, what, outcome)');
  if (durationAccuracy < 70) recommendations.push('Schedule buffer time between back-to-back meetings');

  const assessment = `## Your Planning Score: ${score}%

### Strengths
${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : '- Keep adding details to your calendar events'}

### Areas to Improve
${improvements.length > 0 ? improvements.map(i => `- ${i}`).join('\n') : '- Great job! Your calendar is well-organized'}

### Recommendations
${recommendations.length > 0 ? recommendations.map(r => `1. ${r}`).join('\n') : '1. Maintain your current calendar hygiene'}`;

  return {
    score,
    components: {
      eventCoverage: Math.round(eventCoverage),
      titleQuality: Math.round(titleQuality),
      durationAccuracy: Math.round(durationAccuracy),
      recurringUsage: Math.round(recurringUsage),
      descriptionQuality: Math.round(descriptionQuality)
    },
    assessment
  };
}

// Per-event planning score for calendar view badges
export function calculateEventPlanningScore(event: Event): number {
  let score = 0;

  // Title quality (40%)
  const words = event.title.trim().split(/\s+/).length;
  const isVague = VAGUE_TITLES.some(v => event.title.toLowerCase().includes(v));
  if (words > 3 && !isVague) score += 40;
  else if (words > 1 && !isVague) score += 20;

  // Duration accuracy (30%)
  if (!event.isAllDay && event.durationMinutes >= 15 && event.durationMinutes <= 240) {
    score += 30;
  }

  // Description (20%)
  if (event.description && event.description.length > 10) score += 20;

  // Recurring (10%)
  if (event.isRecurring) score += 10;

  return score;
}
```

---

## API Endpoints

### Create Audit

Create `src/app/api/audit/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, events, users } from '@/lib/db/schema';
import { getEvents } from '@/lib/google-calendar';
import { classifyEvent } from '@/lib/classification';
import { detectLeave } from '@/lib/leave-detection';
import { calculateMetrics } from '@/lib/metrics';
import { calculatePlanningScore, calculateEventPlanningScore } from '@/lib/planning-score';
import { encrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { dateStart, dateEnd, calendarIds, exclusions } = await request.json();

  // Get user data
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check solo founder
  const isSoloFounder = user.teamComposition?.founder === 1 &&
    Object.entries(user.teamComposition).filter(([k, v]) => k !== 'founder' && v > 0).length === 0;

  // Create audit run
  const [auditRun] = await db.insert(auditRuns).values({
    userId: session.user.id,
    dateStart: new Date(dateStart),
    dateEnd: new Date(dateEnd),
    calendarsIncluded: calendarIds || ['primary'],
    exclusionsUsed: exclusions || ['lunch', 'gym'],
    status: 'processing',
    algorithmVersion: '1.7'
  }).returning();

  try {
    // Fetch events from Google Calendar
    const rawEvents = await getEvents(
      session.user.id,
      calendarIds || ['primary'],
      dateStart,
      dateEnd
    );

    // Process events
    const processedEvents = [];
    for (const raw of rawEvents) {
      // Check exclusions
      const isExcluded = (exclusions || ['lunch', 'gym']).some(ex =>
        raw.title.toLowerCase().includes(ex.toLowerCase())
      );
      if (isExcluded) continue;

      // Detect leave
      const leaveResult = detectLeave(raw.title, raw.description, raw.isAllDay, raw.eventType);

      // Calculate duration
      let durationMinutes = 0;
      if (raw.isAllDay) {
        durationMinutes = 8 * 60; // 8 hours default
      } else {
        durationMinutes = Math.round(
          (new Date(raw.end).getTime() - new Date(raw.start).getTime()) / (1000 * 60)
        );
      }

      // Classify (only if not leave)
      let classification = null;
      if (!leaveResult.isLeave) {
        classification = classifyEvent(raw.title, raw.description, raw.attendees, isSoloFounder);
      }

      // Calculate per-event planning score
      const eventPlanningScore = calculateEventPlanningScore({
        title: raw.title,
        description: raw.description,
        durationMinutes,
        isRecurring: raw.isRecurring,
        isAllDay: raw.isAllDay
      });

      processedEvents.push({
        auditRunId: auditRun.id,
        externalEventId: raw.id,
        startAt: new Date(raw.start),
        endAt: new Date(raw.end),
        durationMinutes,
        isAllDay: raw.isAllDay,
        calendarId: raw.calendarId,
        title: encrypt(raw.title),
        description: raw.description ? encrypt(raw.description) : null,
        attendeesCount: raw.attendees,
        hasMeetLink: raw.hasMeetLink,
        isRecurring: raw.isRecurring,
        suggestedTier: classification?.suggestedTier || null,
        finalTier: classification?.suggestedTier || null, // Start with suggested
        businessArea: classification?.businessArea || null,
        vertical: classification?.vertical || null,
        confidenceScore: classification?.confidence || null,
        keywordsMatched: classification?.keywordsMatched || [],
        isLeave: leaveResult.isLeave,
        leaveDetectionMethod: leaveResult.method,
        leaveConfidence: leaveResult.confidence,
        planningScore: eventPlanningScore
      });
    }

    // Insert events
    if (processedEvents.length > 0) {
      await db.insert(events).values(processedEvents);
    }

    // Calculate metrics
    const auditDays = Math.ceil(
      (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const metrics = calculateMetrics(
      processedEvents.map(e => ({
        durationMinutes: e.durationMinutes,
        finalTier: e.finalTier || 'senior',
        vertical: e.vertical || 'business',
        isLeave: e.isLeave
      })),
      {
        salaryAnnual: user.salaryAnnual ? Number(user.salaryAnnual) : null,
        equityPercentage: user.equityPercentage ? Number(user.equityPercentage) : null,
        companyValuation: user.companyValuation ? Number(user.companyValuation) : null,
        vestingPeriodYears: user.vestingPeriodYears ? Number(user.vestingPeriodYears) : null,
        seniorEngineeringRate: Number(user.seniorEngineeringRate),
        seniorBusinessRate: Number(user.seniorBusinessRate),
        juniorEngineeringRate: Number(user.juniorEngineeringRate),
        juniorBusinessRate: Number(user.juniorBusinessRate),
        eaRate: Number(user.eaRate)
      },
      auditDays
    );

    // Calculate planning score
    const planningResult = calculatePlanningScore(
      processedEvents.map(e => ({
        title: e.title, // Note: encrypted, need to decrypt for scoring
        description: e.description || '',
        durationMinutes: e.durationMinutes,
        isRecurring: e.isRecurring,
        isAllDay: e.isAllDay
      })),
      auditDays
    );

    // Update audit run with metrics
    await db.update(auditRuns)
      .set({
        status: 'completed',
        computedMetrics: metrics,
        planningScore: planningResult.score,
        planningAssessment: planningResult.assessment,
        leaveDaysDetected: processedEvents.filter(e => e.isLeave).length,
        leaveHoursExcluded: String(processedEvents.filter(e => e.isLeave).reduce((sum, e) => sum + e.durationMinutes / 60, 0))
      })
      .where(eq(auditRuns.id, auditRun.id));

    return NextResponse.json({
      auditId: auditRun.id,
      status: 'completed',
      eventCount: processedEvents.length
    });

  } catch (error) {
    console.error('Audit creation error:', error);
    await db.update(auditRuns)
      .set({ status: 'failed' })
      .where(eq(auditRuns.id, auditRun.id));

    return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
  }
}
```

### Recalculate Metrics

Create `src/app/api/audit/[id]/recalculate/route.ts`:

```typescript
// Recalculates metrics after tier changes
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // ... fetch events, user rates, recalculate metrics, update audit run
  // CRITICAL: Never return NaN - always use null for missing values
}
```

---

## Test Instructions

Before proceeding to Phase 3, verify all of the following.

**Retry Policy:** If a test fails, fix the issue and retry. After 5 failed attempts on the same test, stop and ask the user for guidance.

### AUDIT-01: Audit Creation Works

**What to verify:**
- Call `POST /api/audit/create` with valid date range
- Check audit run is created
- Check events are ingested

**Success criteria:**
- Returns 200 with `auditId`
- Events table populated with encrypted titles
- Audit run status is "completed"

### AUDIT-02: Leave Detection Works

**What to verify:**
- Create calendar events with "PTO", "Vacation", "OOO" in titles
- Run an audit covering those dates

**Success criteria:**
- Leave events are marked with `isLeave: true`
- Leave events have appropriate confidence levels
- Leave days are counted in `leaveDaysDetected`

### AUDIT-03: Classification Produces Valid Tiers

**What to verify:**
- After audit completes, check event classifications
- Verify each event has a suggested tier

**Success criteria:**
- All events have `suggestedTier` assigned
- Tiers are one of: unique, founder, senior, junior, ea
- Confidence levels are assigned (high/medium/low)

### AUDIT-04: No NaN in Metrics

**What to verify:**
- Create audit with user who has NO salary set
- Create audit with user who HAS salary set
- Check all metric values

**Success criteria:**
- With no salary: `founderCostTotal` is `null`, not NaN or 0
- With no salary: `arbitrage` is `null`, not NaN
- With salary: all metrics are valid numbers
- `efficiencyScore` and `planningScore` are integers 0-100
- No field anywhere contains NaN

### AUDIT-05: Recalculation Updates Metrics

**What to verify:**
- Complete an audit
- Change an event's tier via API
- Call recalculate endpoint

**Success criteria:**
- Metrics update to reflect the tier change
- Hours by tier change appropriately
- Arbitrage recalculates (if salary set)

### AUDIT-06: Solo Founder Gets 4 Tiers

**What to verify:**
- Set user's team composition to `{ founder: 1 }`
- Run classification

**Success criteria:**
- No events classified as "founder" tier
- Events that would be "founder" are assigned to "unique"
- Only 4 tiers in use: unique, senior, junior, ea

### AUDIT-07: Overlapping Events Handled

**What to verify:**
- Create overlapping calendar events
- Run an audit

**Success criteria:**
- Events are stored individually
- Total hours calculation accounts for overlaps (count time once)
- No double-counting of time in metrics

### AUDIT-08: Planning Score Calculates

**What to verify:**
- Complete an audit
- Check planning score

**Success criteria:**
- `planningScore` is integer 0-100
- `planningAssessment` is markdown text
- Per-event planning scores assigned

---

## Handoff Requirements

Phase 2 is complete when ALL of the following are true:

| Requirement | How to Verify |
|-------------|---------------|
| Audits can be created | POST /api/audit/create returns auditId |
| Events are ingested | Events table has encrypted data |
| Leave is detected | Events with PTO/vacation marked as leave |
| Classification works | All events have suggested tiers |
| Metrics calculate correctly | All metrics are numbers (no NaN) |
| Null salary handled | Shows null, not $0 or NaN |
| Solo founder logic works | Only 4 tiers assigned |
| Recalculation works | Changing tier updates metrics |
| Planning score works | Score 0-100, assessment generated |

**Do not proceed to Phase 3 until all tests pass and all handoff requirements are met.**

---

## Common Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| NaN in metrics | Division by zero or null propagation | Add defensive checks: `value ?? null` |
| Events not encrypting | Encryption key wrong format | Key must be 64 hex chars (32 bytes) |
| Classification always "senior" | Keyword matching too narrow | Check case-insensitivity |
| Leave not detected | Keywords not matching | Ensure lowercase comparison |
| Overlaps not detected | Time comparison logic | Use proper date parsing |

---

## Next Phase

Once all tests pass, proceed to **Phase 3: Results & Recommendations**.

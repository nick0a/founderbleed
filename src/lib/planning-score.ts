// Planning Score Calculation for Founder Bleed
// Measures calendar hygiene and planning quality

export interface PlanningScoreResult {
  score: number; // 0-100
  components: {
    eventCoverage: number; // 25%
    titleQuality: number; // 25%
    durationAccuracy: number; // 25%
    recurringUsage: number; // 15%
    descriptionQuality: number; // 10%
  };
  assessment: string; // markdown
}

export interface PlanningEvent {
  title: string;
  description: string | null;
  durationMinutes: number;
  isRecurring: boolean;
  isAllDay: boolean;
}

// Vague titles that indicate poor planning
const VAGUE_TITLES = [
  'call',
  'meeting',
  'chat',
  'sync',
  'catch up',
  'touch base',
  'check in',
  'TBD',
  'busy',
  'blocked',
  '1:1',
  'quick call',
  'quick chat',
];

export function calculatePlanningScore(
  events: PlanningEvent[],
  auditDays: number
): PlanningScoreResult {
  if (events.length === 0) {
    return {
      score: 0,
      components: {
        eventCoverage: 0,
        titleQuality: 0,
        durationAccuracy: 0,
        recurringUsage: 0,
        descriptionQuality: 0,
      },
      assessment:
        '## Your Planning Score: 0%\n\nNo events found in the selected period.',
    };
  }

  // Event Coverage (25%): % of 40hr/week with scheduled events
  const totalHours = events.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
  const expectedHours = (auditDays / 7) * 40;
  const eventCoverage = Math.min(100, (totalHours / expectedHours) * 100);

  // Title Quality (25%): % of events with descriptive titles (>3 words, not vague)
  const descriptiveTitles = events.filter((e) => {
    const words = e.title.trim().split(/\s+/).length;
    const titleLower = e.title.toLowerCase();
    const isVague = VAGUE_TITLES.some((v) => titleLower === v || titleLower.startsWith(v + ' '));
    return words > 3 && !isVague;
  });
  const titleQuality = (descriptiveTitles.length / events.length) * 100;

  // Duration Accuracy (25%): % of events with realistic durations (15min - 4hrs)
  const realisticDurations = events.filter(
    (e) => !e.isAllDay && e.durationMinutes >= 15 && e.durationMinutes <= 240
  );
  const durationAccuracy = (realisticDurations.length / events.length) * 100;

  // Recurring Usage (15%): % of recurring events
  const recurringEvents = events.filter((e) => e.isRecurring);
  const recurringUsage = (recurringEvents.length / events.length) * 100;

  // Description Quality (10%): % of events with descriptions
  const withDescriptions = events.filter(
    (e) => e.description && e.description.length > 10
  );
  const descriptionQuality = (withDescriptions.length / events.length) * 100;

  // Calculate weighted score
  const score = Math.round(
    eventCoverage * 0.25 +
      titleQuality * 0.25 +
      durationAccuracy * 0.25 +
      recurringUsage * 0.15 +
      descriptionQuality * 0.1
  );

  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Generate assessment
  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  if (recurringUsage > 50)
    strengths.push(
      `Good use of recurring events (${Math.round(recurringUsage)}% of meetings are recurring)`
    );
  if (titleQuality > 70)
    strengths.push('Most events have descriptive titles');
  if (descriptionQuality > 50)
    strengths.push('Good use of event descriptions and agendas');
  if (eventCoverage > 70)
    strengths.push(
      `Strong calendar coverage (${Math.round(eventCoverage)}% of expected work hours)`
    );

  if (eventCoverage < 50)
    improvements.push(
      `Only ${Math.round(eventCoverage)}% of your work hours have scheduled events`
    );
  const vagueCount = events.length - descriptiveTitles.length;
  if (vagueCount > 0)
    improvements.push(
      `${vagueCount} events have vague titles like "Call" or "Meeting"`
    );
  if (descriptionQuality < 30)
    improvements.push('Consider adding agendas to your meetings');
  if (recurringUsage < 20)
    improvements.push(
      'Consider using recurring events for regular meetings'
    );

  if (eventCoverage < 50)
    recommendations.push(
      'Block time for deep work (consider adding "focus time" blocks)'
    );
  if (titleQuality < 70)
    recommendations.push(
      'Add context to meeting titles (who, what, outcome)'
    );
  if (durationAccuracy < 70)
    recommendations.push(
      'Schedule buffer time between back-to-back meetings'
    );
  if (descriptionQuality < 30)
    recommendations.push(
      'Add agendas or objectives to calendar events'
    );

  const assessment = `## Your Planning Score: ${clampedScore}%

### Strengths
${strengths.length > 0 ? strengths.map((s) => `- ${s}`).join('\n') : '- Keep adding details to your calendar events'}

### Areas to Improve
${improvements.length > 0 ? improvements.map((i) => `- ${i}`).join('\n') : '- Great job! Your calendar is well-organized'}

### Recommendations
${recommendations.length > 0 ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') : '1. Maintain your current calendar hygiene'}`;

  return {
    score: clampedScore,
    components: {
      eventCoverage: Math.round(eventCoverage),
      titleQuality: Math.round(titleQuality),
      durationAccuracy: Math.round(durationAccuracy),
      recurringUsage: Math.round(recurringUsage),
      descriptionQuality: Math.round(descriptionQuality),
    },
    assessment,
  };
}

// Per-event planning score for calendar view badges
export function calculateEventPlanningScore(event: PlanningEvent): number {
  let score = 0;

  // Title quality (40%)
  const words = event.title.trim().split(/\s+/).length;
  const titleLower = event.title.toLowerCase();
  const isVague = VAGUE_TITLES.some((v) => titleLower === v || titleLower.startsWith(v + ' '));
  if (words > 3 && !isVague) score += 40;
  else if (words > 1 && !isVague) score += 20;

  // Duration accuracy (30%)
  if (
    !event.isAllDay &&
    event.durationMinutes >= 15 &&
    event.durationMinutes <= 240
  ) {
    score += 30;
  }

  // Description (20%)
  if (event.description && event.description.length > 10) score += 20;

  // Recurring (10%)
  if (event.isRecurring) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Get planning score badge color
export function getPlanningScoreBadgeColor(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

// Get planning score label
export function getPlanningScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

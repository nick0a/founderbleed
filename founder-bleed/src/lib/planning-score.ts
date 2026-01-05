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
    score: isNaN(score) ? 0 : score,
    components: {
      eventCoverage: Math.round(eventCoverage) || 0,
      titleQuality: Math.round(titleQuality) || 0,
      durationAccuracy: Math.round(durationAccuracy) || 0,
      recurringUsage: Math.round(recurringUsage) || 0,
      descriptionQuality: Math.round(descriptionQuality) || 0
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
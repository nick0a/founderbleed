export interface PlanningScoreResult {
  score: number;
  components: {
    eventCoverage: number;
    titleQuality: number;
    durationAccuracy: number;
    recurringUsage: number;
    descriptionQuality: number;
  };
  assessment: string;
}

interface Event {
  title: string;
  description: string;
  durationMinutes: number;
  isRecurring: boolean;
  isAllDay: boolean;
}

const VAGUE_TITLES = [
  "call",
  "meeting",
  "chat",
  "sync",
  "catch up",
  "touch base",
  "check in",
  "TBD",
  "busy",
];

export function calculatePlanningScore(
  events: Event[],
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
      assessment: "## Your Planning Score: 0%\n\nNo events found in the selected period.",
    };
  }

  const totalHours = events.reduce(
    (sum, event) => sum + event.durationMinutes / 60,
    0
  );
  const normalizedDays = Math.max(auditDays, 1);
  const expectedHours = (normalizedDays / 7) * 40;
  const eventCoverage = Math.min(100, (totalHours / expectedHours) * 100);

  const descriptiveTitles = events.filter((event) => {
    const words = event.title.trim().split(/\s+/).length;
    const isVague = VAGUE_TITLES.some((v) =>
      event.title.toLowerCase().includes(v.toLowerCase())
    );
    return words > 3 && !isVague;
  });
  const titleQuality = (descriptiveTitles.length / events.length) * 100;

  const realisticDurations = events.filter(
    (event) => !event.isAllDay && event.durationMinutes >= 15 && event.durationMinutes <= 240
  );
  const durationAccuracy = (realisticDurations.length / events.length) * 100;

  const recurringEvents = events.filter((event) => event.isRecurring);
  const recurringUsage = (recurringEvents.length / events.length) * 100;

  const withDescriptions = events.filter(
    (event) => event.description && event.description.length > 10
  );
  const descriptionQuality = (withDescriptions.length / events.length) * 100;

  const score = Math.round(
    eventCoverage * 0.25 +
      titleQuality * 0.25 +
      durationAccuracy * 0.25 +
      recurringUsage * 0.15 +
      descriptionQuality * 0.1
  );

  const strengths: string[] = [];
  const improvements: string[] = [];
  const recommendations: string[] = [];

  if (recurringUsage > 50) {
    strengths.push(
      `Good use of recurring events (${Math.round(recurringUsage)}% of meetings are recurring)`
    );
  }
  if (titleQuality > 70) strengths.push("Most events have descriptive titles");
  if (descriptionQuality > 50) strengths.push("Good use of event descriptions and agendas");

  if (eventCoverage < 50) {
    improvements.push(
      `Only ${Math.round(eventCoverage)}% of your work hours have scheduled events`
    );
  }
  const vagueCount = events.length - descriptiveTitles.length;
  if (vagueCount > 0) {
    improvements.push(`${vagueCount} events have vague titles like \"Call\" or \"Meeting\"`);
  }
  if (descriptionQuality < 30) {
    improvements.push("Consider adding agendas to your meetings");
  }

  if (eventCoverage < 50) {
    recommendations.push("Block time for deep work (consider adding \"focus time\" blocks)");
  }
  if (titleQuality < 70) {
    recommendations.push("Add context to meeting titles (who, what, outcome)");
  }
  if (durationAccuracy < 70) {
    recommendations.push("Schedule buffer time between back-to-back meetings");
  }

  const assessment = `## Your Planning Score: ${score}%\n\n### Strengths\n${
    strengths.length > 0
      ? strengths.map((strength) => `- ${strength}`).join("\n")
      : "- Keep adding details to your calendar events"
  }\n\n### Areas to Improve\n${
    improvements.length > 0
      ? improvements.map((improvement) => `- ${improvement}`).join("\n")
      : "- Great job! Your calendar is well-organized"
  }\n\n### Recommendations\n${
    recommendations.length > 0
      ? recommendations.map((rec, index) => `${index + 1}. ${rec}`).join("\n")
      : "1. Maintain your current calendar hygiene"
  }`;

  return {
    score,
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

export function calculateEventPlanningScore(event: Event): number {
  let score = 0;

  const words = event.title.trim().split(/\s+/).length;
  const isVague = VAGUE_TITLES.some((v) =>
    event.title.toLowerCase().includes(v.toLowerCase())
  );
  if (words > 3 && !isVague) score += 40;
  else if (words > 1 && !isVague) score += 20;

  if (!event.isAllDay && event.durationMinutes >= 15 && event.durationMinutes <= 240) {
    score += 30;
  }

  if (event.description && event.description.length > 10) score += 20;

  if (event.isRecurring) score += 10;

  return score;
}

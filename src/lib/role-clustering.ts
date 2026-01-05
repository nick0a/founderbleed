// Role Clustering Algorithm for Founder Bleed
// Generates hiring recommendations from calendar audit data

export interface RoleTask {
  task: string;
  hoursPerWeek: number;
}

export interface RoleRecommendation {
  roleTitle: string;
  roleTier: 'senior' | 'junior' | 'ea';
  vertical: 'engineering' | 'business' | null;
  businessArea: string;
  hoursPerWeek: number;
  costWeekly: number;
  costMonthly: number;
  costAnnual: number;
  tasks: RoleTask[];
  jdText: string;
}

export interface ClusterEvent {
  title: string;
  finalTier: string | null;
  businessArea: string | null;
  vertical: string | null;
  durationMinutes: number;
}

export interface TierRates {
  senior: number;
  junior: number;
  ea: number;
}

// Minimum hours threshold for standalone role
const MIN_HOURS_FOR_ROLE = 8;

// Role title mappings
type RoleTitleMap = Record<string, Record<string, Record<string, string>>>;

const ROLE_TITLES: RoleTitleMap = {
  senior: {
    engineering: {
      Development: 'Senior Developer',
      Design: 'Senior Designer',
      'Data/Analytics': 'Senior Data Analyst',
      Consolidated: 'Technical Lead',
    },
    business: {
      Finance: 'Finance Manager',
      'Recruiting Ops': 'Talent Lead',
      Marketing: 'Marketing Manager',
      Sales: 'Account Manager',
      'Customer Success': 'Customer Success Manager',
      Partnerships: 'Partnerships Manager',
      Operations: 'Operations Manager',
      'Legal/Admin': 'Legal Coordinator',
      Consolidated: 'Operations Manager',
    },
  },
  junior: {
    engineering: {
      Development: 'Junior Developer',
      Design: 'Junior Designer',
      'Data/Analytics': 'Data Analyst',
      Consolidated: 'Technical Coordinator',
    },
    business: {
      Finance: 'Finance Coordinator',
      'Recruiting Ops': 'Recruiting Coordinator',
      Marketing: 'Marketing Coordinator',
      Sales: 'Sales Development Rep',
      'Customer Success': 'Customer Support Rep',
      Consolidated: 'Business Coordinator',
    },
  },
  ea: {
    any: {
      Consolidated: 'Executive Assistant',
      Operations: 'Executive Assistant',
    },
  },
};

function generateRoleTitle(
  tier: string,
  vertical: string | null,
  businessArea: string
): string {
  if (tier === 'ea') {
    return 'Executive Assistant';
  }

  const tierTitles = ROLE_TITLES[tier];
  if (!tierTitles) return `${tier} ${businessArea}`;

  const verticalTitles = tierTitles[vertical || 'business'];
  if (!verticalTitles) return `${tier} ${businessArea}`;

  return verticalTitles[businessArea] || verticalTitles['Consolidated'] || `${tier} ${businessArea}`;
}

function generateJobDescription(role: RoleRecommendation): string {
  const employmentType = role.hoursPerWeek >= 30 ? 'Full-time' : 'Part-time';
  const verticalDisplay = role.vertical
    ? role.vertical.charAt(0).toUpperCase() + role.vertical.slice(1)
    : 'N/A';

  const tasksList = role.tasks
    .map((t) => `- ${t.task} (${t.hoursPerWeek} hrs/week)`)
    .join('\n');

  const responsibilities = generateResponsibilities(role);
  const skills = generateRequiredSkills(role);
  const profile = generateIdealProfile(role);

  return `# ${role.roleTitle}

**Employment Type:** ${employmentType} (${role.hoursPerWeek} hours/week)
**Tier:** ${role.roleTier.charAt(0).toUpperCase() + role.roleTier.slice(1)}
**Vertical:** ${verticalDisplay}
**Business Area:** ${role.businessArea}
**Estimated Cost:** $${role.costWeekly.toLocaleString()}/week | $${role.costMonthly.toLocaleString()}/month | $${role.costAnnual.toLocaleString()}/year

## Tasks You'll Take Over
*Based on your calendar audit*

${tasksList}

## Key Responsibilities

${responsibilities}

## Required Skills

${skills}

## Ideal Candidate Profile

${profile}`;
}

function generateResponsibilities(role: RoleRecommendation): string {
  const baseResponsibilities: Record<string, string[]> = {
    'Senior Developer': [
      '- Lead technical architecture decisions and code reviews',
      '- Mentor junior developers and establish best practices',
      '- Collaborate with product team on feature specifications',
      '- Own critical system components and technical debt reduction',
    ],
    'Junior Developer': [
      '- Implement features under senior developer guidance',
      '- Write tests and documentation for code changes',
      '- Participate in code reviews and team stand-ups',
      '- Debug and fix reported issues',
    ],
    'Marketing Manager': [
      '- Develop and execute marketing campaigns',
      '- Create content strategy and manage content calendar',
      '- Analyze marketing metrics and optimize campaigns',
      '- Coordinate with sales on lead generation',
    ],
    'Executive Assistant': [
      '- Manage calendar and schedule meetings efficiently',
      '- Handle travel arrangements and expense reports',
      '- Coordinate team events and office logistics',
      '- Screen communications and prepare briefings',
    ],
    default: [
      '- Take ownership of delegated tasks and projects',
      '- Maintain clear communication with stakeholders',
      '- Track progress and report on deliverables',
      '- Identify process improvements in your area',
    ],
  };

  const responsibilities =
    baseResponsibilities[role.roleTitle] || baseResponsibilities['default'];
  return responsibilities.join('\n');
}

function generateRequiredSkills(role: RoleRecommendation): string {
  const skillSets: Record<string, string[]> = {
    engineering: [
      '- Proficiency in relevant programming languages and frameworks',
      '- Strong problem-solving and analytical skills',
      '- Experience with version control (Git) and CI/CD',
      '- Excellent written and verbal communication',
    ],
    business: [
      '- Strong organizational and project management skills',
      '- Proficiency with business tools (Google Workspace, Slack, etc.)',
      '- Excellent communication and interpersonal skills',
      '- Ability to work independently and prioritize effectively',
    ],
    ea: [
      '- Exceptional organizational and time management skills',
      '- Discretion and confidentiality handling sensitive information',
      '- Proficiency with calendar, email, and travel booking tools',
      '- Strong written and verbal communication',
    ],
  };

  const skills =
    role.roleTier === 'ea'
      ? skillSets['ea']
      : skillSets[role.vertical || 'business'];
  return skills.join('\n');
}

function generateIdealProfile(role: RoleRecommendation): string {
  const profiles: Record<string, string> = {
    senior:
      "You're a self-starter with 5+ years of experience who can own projects end-to-end. You thrive in fast-paced environments and can balance quality with speed.",
    junior:
      "You're eager to learn and grow, with 1-2 years of relevant experience or strong transferable skills. You take direction well and communicate proactively.",
    ea: "You're highly organized, anticipate needs before they're expressed, and take pride in making executives more effective. Startup experience is a plus.",
  };

  return profiles[role.roleTier] || profiles['junior'];
}

export function generateRoleRecommendations(
  events: ClusterEvent[],
  auditDays: number,
  tierRates: TierRates
): RoleRecommendation[] {
  // Filter to delegable tiers only
  const delegable = events.filter(
    (e) =>
      e.finalTier &&
      ['senior', 'junior', 'ea'].includes(e.finalTier) &&
      !e.businessArea?.includes('Leave')
  );

  if (delegable.length === 0) {
    return [];
  }

  // Group by tier + businessArea
  const clusters = new Map<string, ClusterEvent[]>();
  for (const event of delegable) {
    const tier = event.finalTier!;
    const area = event.businessArea || 'Operations';
    const key = `${tier}:${area}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(event);
  }

  // Calculate weekly multiplier
  const weeksInPeriod = Math.max(auditDays / 7, 1);
  const recommendations: RoleRecommendation[] = [];
  const consolidationBuckets: Record<string, ClusterEvent[]> = {
    senior: [],
    junior: [],
    ea: [],
  };

  // Process each cluster
  for (const [key, clusterEvents] of clusters) {
    const [tier, businessArea] = key.split(':');
    const totalMinutes = clusterEvents.reduce(
      (sum, e) => sum + (e.durationMinutes || 0),
      0
    );
    const weeklyHours = totalMinutes / 60 / weeksInPeriod;

    if (weeklyHours >= MIN_HOURS_FOR_ROLE) {
      // Create specialized role
      const role = createRole(
        tier,
        businessArea,
        clusterEvents,
        weeklyHours,
        tierRates,
        weeksInPeriod
      );
      recommendations.push(role);
    } else {
      // Add to consolidation bucket
      consolidationBuckets[tier].push(...clusterEvents);
    }
  }

  // Process consolidation buckets
  for (const [tier, bucketEvents] of Object.entries(consolidationBuckets)) {
    if (bucketEvents.length === 0) continue;

    const totalMinutes = bucketEvents.reduce(
      (sum, e) => sum + (e.durationMinutes || 0),
      0
    );
    const weeklyHours = totalMinutes / 60 / weeksInPeriod;

    if (weeklyHours >= MIN_HOURS_FOR_ROLE) {
      const role = createRole(
        tier,
        'Consolidated',
        bucketEvents,
        weeklyHours,
        tierRates,
        weeksInPeriod
      );
      recommendations.push(role);
    }
  }

  // Sort by hours descending
  recommendations.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  // Limit to 5 roles max - combine extras into last role
  if (recommendations.length > 5) {
    const kept = recommendations.slice(0, 4);
    const combined = recommendations.slice(4);
    const combinedHours = combined.reduce((sum, r) => sum + r.hoursPerWeek, 0);
    const combinedTasks = combined.flatMap((r) => r.tasks);

    // Use the tier of the largest combined role
    const primaryRole = combined[0];
    const consolidatedRole = createRoleFromData(
      primaryRole.roleTier,
      'Consolidated',
      primaryRole.vertical,
      combinedHours,
      tierRates,
      combinedTasks
    );
    kept.push(consolidatedRole);
    return kept;
  }

  return recommendations;
}

function createRole(
  tier: string,
  businessArea: string,
  events: ClusterEvent[],
  weeklyHours: number,
  tierRates: TierRates,
  weeksInPeriod: number
): RoleRecommendation {
  const vertical =
    tier === 'ea' ? null : (events[0]?.vertical as 'engineering' | 'business') || 'business';
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const rate =
    tier === 'ea'
      ? tierRates.ea
      : tier === 'senior'
        ? tierRates.senior
        : tierRates.junior;

  const hoursPerWeek = Math.ceil(weeklyHours);
  const fractionOfFullTime = Math.min(hoursPerWeek / 40, 1);
  const costAnnual = Math.round(rate * fractionOfFullTime);
  const costWeekly = Math.round(costAnnual / 52);
  const costMonthly = Math.round(costWeekly * 4.33);

  // Aggregate tasks by title
  const taskMap = new Map<string, number>();
  for (const event of events) {
    const title = event.title || 'Untitled Task';
    const hours = (event.durationMinutes || 0) / 60 / weeksInPeriod;
    const existing = taskMap.get(title) || 0;
    taskMap.set(title, existing + hours);
  }

  const tasks = Array.from(taskMap.entries())
    .map(([task, hours]) => ({
      task,
      hoursPerWeek: Math.round(hours * 10) / 10,
    }))
    .filter((t) => t.hoursPerWeek >= 0.1)
    .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
    .slice(0, 10);

  const recommendation: RoleRecommendation = {
    roleTitle,
    roleTier: tier as 'senior' | 'junior' | 'ea',
    vertical,
    businessArea,
    hoursPerWeek,
    costWeekly,
    costMonthly,
    costAnnual,
    tasks,
    jdText: '',
  };

  recommendation.jdText = generateJobDescription(recommendation);

  return recommendation;
}

function createRoleFromData(
  tier: string,
  businessArea: string,
  vertical: 'engineering' | 'business' | null,
  weeklyHours: number,
  tierRates: TierRates,
  tasks: RoleTask[]
): RoleRecommendation {
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const rate =
    tier === 'ea'
      ? tierRates.ea
      : tier === 'senior'
        ? tierRates.senior
        : tierRates.junior;

  const hoursPerWeek = Math.ceil(weeklyHours);
  const fractionOfFullTime = Math.min(hoursPerWeek / 40, 1);
  const costAnnual = Math.round(rate * fractionOfFullTime);
  const costWeekly = Math.round(costAnnual / 52);
  const costMonthly = Math.round(costWeekly * 4.33);

  // Consolidate tasks
  const taskMap = new Map<string, number>();
  for (const task of tasks) {
    const existing = taskMap.get(task.task) || 0;
    taskMap.set(task.task, existing + task.hoursPerWeek);
  }

  const consolidatedTasks = Array.from(taskMap.entries())
    .map(([task, hours]) => ({
      task,
      hoursPerWeek: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
    .slice(0, 10);

  const recommendation: RoleRecommendation = {
    roleTitle,
    roleTier: tier as 'senior' | 'junior' | 'ea',
    vertical,
    businessArea,
    hoursPerWeek,
    costWeekly,
    costMonthly,
    costAnnual,
    tasks: consolidatedTasks,
    jdText: '',
  };

  recommendation.jdText = generateJobDescription(recommendation);

  return recommendation;
}

// Calculate total potential savings from delegating
export function calculateTotalSavings(
  recommendations: RoleRecommendation[],
  founderHourlyRate: number | null
): {
  weeklyHoursSaved: number;
  weeklyCostSaved: number | null;
  annualCostSaved: number | null;
} {
  const weeklyHoursSaved = recommendations.reduce(
    (sum, r) => sum + r.hoursPerWeek,
    0
  );

  if (founderHourlyRate === null) {
    return {
      weeklyHoursSaved,
      weeklyCostSaved: null,
      annualCostSaved: null,
    };
  }

  const weeklyCostSaved = Math.round(weeklyHoursSaved * founderHourlyRate);
  const annualCostSaved = Math.round(weeklyCostSaved * 52);

  return {
    weeklyHoursSaved,
    weeklyCostSaved,
    annualCostSaved,
  };
}

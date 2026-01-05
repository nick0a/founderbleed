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

interface EventForClustering {
  title: string;
  finalTier: string;
  businessArea: string;
  vertical: string;
  durationMinutes: number;
}

interface TierRates {
  senior: number;
  junior: number;
  ea: number;
}

const ROLE_TITLE_MAP: Record<string, Record<string, string>> = {
  senior: {
    Development: 'Senior Developer',
    Design: 'Senior Designer',
    'Data/Analytics': 'Senior Data Analyst',
    Finance: 'Finance Manager',
    'Recruiting Ops': 'Talent Lead',
    Marketing: 'Marketing Manager',
    Sales: 'Account Manager',
    Consolidated: 'Operations Manager',
    default: 'Senior Specialist'
  },
  junior: {
    Development: 'Junior Developer',
    Consolidated: 'Technical Coordinator',
    default: 'Operations Coordinator'
  },
  ea: {
    default: 'Executive Assistant'
  }
};

function generateRoleTitle(tier: string, vertical: string | null, businessArea: string): string {
  const tierMap = ROLE_TITLE_MAP[tier] || ROLE_TITLE_MAP.senior;
  
  if (tierMap[businessArea]) {
    return tierMap[businessArea];
  }
  
  if (tier === 'junior' && vertical === 'engineering') {
    return 'Technical Coordinator';
  }
  
  if (tier === 'junior') {
    return 'Business Coordinator';
  }
  
  return tierMap.default || `${tier.charAt(0).toUpperCase() + tier.slice(1)} Specialist`;
}

export function generateRoleRecommendations(
  events: EventForClustering[],
  auditDays: number,
  tierRates: TierRates
): RoleRecommendation[] {
  // Filter to delegable tiers only
  const delegable = events.filter(e => ['senior', 'junior', 'ea'].includes(e.finalTier));

  if (delegable.length === 0) {
    return [];
  }

  // Group by tier + businessArea
  const clusters = new Map<string, EventForClustering[]>();
  for (const event of delegable) {
    const key = `${event.finalTier}:${event.businessArea || 'Operations'}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(event);
  }

  // Calculate weekly hours per cluster
  const weeklyMultiplier = 7 / Math.max(auditDays, 1);
  const recommendations: RoleRecommendation[] = [];
  const consolidationBuckets: Record<string, EventForClustering[]> = { 
    senior: [], 
    junior: [], 
    ea: [] 
  };

  for (const [key, clusterEvents] of clusters) {
    const [tier, businessArea] = key.split(':');
    const totalHours = clusterEvents.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= 8) {
      // Create specialized role
      recommendations.push(createRole(tier, businessArea, clusterEvents, weeklyHours, tierRates, auditDays));
    } else {
      // Add to consolidation bucket
      if (consolidationBuckets[tier]) {
        consolidationBuckets[tier].push(...clusterEvents);
      }
    }
  }

  // Process consolidation buckets
  for (const [tier, bucketEvents] of Object.entries(consolidationBuckets)) {
    if (bucketEvents.length === 0) continue;
    const totalHours = bucketEvents.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= 8) {
      recommendations.push(createRole(tier, 'Consolidated', bucketEvents, weeklyHours, tierRates, auditDays));
    }
  }

  // Sort by hours descending
  recommendations.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  // Limit to 5 roles max - combine lowest if needed
  if (recommendations.length > 5) {
    const toKeep = recommendations.slice(0, 4);
    const toCombine = recommendations.slice(4);
    
    // Combine the rest into the last kept role
    const combinedHours = toCombine.reduce((sum, r) => sum + r.hoursPerWeek, 0);
    const combinedTasks = toCombine.flatMap(r => r.tasks);
    
    if (toKeep.length > 0) {
      const lastRole = toKeep[toKeep.length - 1];
      lastRole.hoursPerWeek += combinedHours;
      lastRole.tasks = [...lastRole.tasks, ...combinedTasks]
        .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
        .slice(0, 10);
      
      // Recalculate costs
      const rate = lastRole.roleTier === 'ea' ? tierRates.ea :
                   lastRole.roleTier === 'senior' ? tierRates.senior : tierRates.junior;
      lastRole.costAnnual = Math.round(rate * (lastRole.hoursPerWeek / 40));
      lastRole.costWeekly = Math.round(lastRole.costAnnual / 52);
      lastRole.costMonthly = Math.round(lastRole.costWeekly * 4.33);
    }
    
    return toKeep;
  }

  return recommendations;
}

function createRole(
  tier: string, 
  businessArea: string, 
  events: EventForClustering[], 
  weeklyHours: number, 
  tierRates: TierRates,
  auditDays: number
): RoleRecommendation {
  const vertical = tier === 'ea' ? null : (events[0]?.vertical || 'business') as 'engineering' | 'business';
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const rate = tier === 'ea' ? tierRates.ea :
               tier === 'senior' ? tierRates.senior : tierRates.junior;

  const hoursPerWeek = Math.min(40, Math.max(8, Math.ceil(weeklyHours)));
  const costAnnual = rate * (hoursPerWeek / 40);
  const costWeekly = costAnnual / 52;
  const costMonthly = costWeekly * 4.33;

  // Aggregate tasks by title
  const taskMap = new Map<string, number>();
  const weeklyMultiplier = 7 / Math.max(auditDays, 1);
  
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
    vertical,
    businessArea,
    hoursPerWeek,
    costWeekly: Math.round(costWeekly),
    costMonthly: Math.round(costMonthly),
    costAnnual: Math.round(costAnnual),
    tasks
  };
}

export function generateJobDescription(role: RoleRecommendation): string {
  const employmentType = role.hoursPerWeek >= 35 ? 'Full-time (40 hours/week)' : `Part-time (${role.hoursPerWeek} hours/week)`;
  const verticalText = role.vertical ? role.vertical.charAt(0).toUpperCase() + role.vertical.slice(1) : 'N/A';
  
  const tasksList = role.tasks
    .map(t => `- ${t.task} (${t.hoursPerWeek} hours/week)`)
    .join('\n');

  return `# ${role.roleTitle}

**Employment Type:** ${employmentType}
**Tier:** ${role.roleTier.charAt(0).toUpperCase() + role.roleTier.slice(1)}
**Vertical:** ${verticalText}
**Business Area:** ${role.businessArea}
**Estimated Cost:** $${role.costWeekly.toLocaleString()}/week | $${role.costMonthly.toLocaleString()}/month | $${role.costAnnual.toLocaleString()}/year

## Tasks You'll Take Over
*Based on your calendar audit*

${tasksList}

## Key Responsibilities

- Take ownership of ${role.businessArea.toLowerCase()} related tasks
- Support founder by handling delegated work independently
- Maintain quality standards and meet deadlines
- Communicate progress and blockers proactively

## Required Skills

${getRequiredSkills(role.roleTier, role.vertical, role.businessArea)}

## Ideal Candidate Profile

${getIdealCandidate(role.roleTier, role.vertical, role.businessArea)}
`;
}

function getRequiredSkills(tier: string, vertical: string | null, businessArea: string): string {
  const skills: string[] = [];
  
  if (vertical === 'engineering') {
    skills.push('- Technical proficiency in relevant tools and languages');
    skills.push('- Problem-solving and analytical thinking');
  } else if (businessArea !== 'Consolidated') {
    skills.push(`- Experience in ${businessArea.toLowerCase()}`);
  }
  
  if (tier === 'senior') {
    skills.push('- 5+ years of relevant experience');
    skills.push('- Leadership and project management skills');
  } else if (tier === 'junior') {
    skills.push('- 1-3 years of relevant experience');
    skills.push('- Eagerness to learn and grow');
  } else {
    skills.push('- Excellent organizational skills');
    skills.push('- Strong attention to detail');
  }
  
  skills.push('- Strong communication skills');
  skills.push('- Ability to work independently');
  
  return skills.join('\n');
}

function getIdealCandidate(tier: string, vertical: string | null, businessArea: string): string {
  if (tier === 'ea') {
    return 'A detail-oriented professional who excels at organization and anticipating needs. You\'re proactive, discreet, and can manage multiple priorities while maintaining a calm demeanor.';
  }
  
  if (tier === 'senior') {
    return `An experienced ${vertical === 'engineering' ? 'technical' : 'business'} professional who can hit the ground running. You have a track record of delivering results and can work with minimal supervision.`;
  }
  
  return `A motivated early-career professional eager to contribute and grow. You\'re comfortable with ambiguity and excited to take on new challenges in a fast-paced environment.`;
}
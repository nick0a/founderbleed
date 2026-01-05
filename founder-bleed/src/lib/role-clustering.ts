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
  const weeklyMultiplier = 7 / Math.max(auditDays, 1);
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
      recommendations.push(createRole(tier, 'Consolidated', bucketEvents, weeklyHours, tierRates));
    }
  }

  // Sort by hours descending
  recommendations.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  // Limit to 5 roles max
  if (recommendations.length > 5) {
    recommendations.splice(5);
  }

  return recommendations;
}

function createRole(tier: string, businessArea: string, events: { title: string, durationMinutes: number, vertical?: string }[], weeklyHours: number, tierRates: { senior: number; junior: number; ea: number }): RoleRecommendation {
  const vertical = tier === 'ea' ? null : (events[0]?.vertical as 'engineering' | 'business' | undefined) || 'business';
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const rate = tier === 'ea' ? tierRates.ea :
               tier === 'senior' ? tierRates.senior : tierRates.junior;

  const hoursPerWeek = Math.ceil(weeklyHours);
  const costAnnual = rate * (hoursPerWeek / 40); // Assuming rate is full-time annual salary
  const costWeekly = costAnnual / 52;
  const costMonthly = costWeekly * 4.33;

  const totalMinutes = events.reduce((sum: number, e: any) => sum + e.durationMinutes, 0);
  const taskMap = new Map<string, number>();
  
  for (const event of events) {
    const existing = taskMap.get(event.title) || 0;
    taskMap.set(event.title, existing + event.durationMinutes);
  }

  const tasks = Array.from(taskMap.entries())
    .map(([task, minutes]) => ({ 
        task, 
        hoursPerWeek: Math.round((minutes / totalMinutes) * weeklyHours * 10) / 10 
    }))
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
    const prefix = tier === 'senior' ? 'Senior ' : tier === 'junior' ? 'Junior ' : '';
    
    if (tier === 'ea') return 'Executive Assistant';
    
    if (businessArea === 'Consolidated') {
        if (vertical === 'engineering') return `${prefix}Technical Coordinator`;
        return `${prefix}Operations Manager`; 
    }
    
    if (vertical === 'engineering') {
        if (businessArea === 'Development') return `${prefix}Developer`;
        if (businessArea === 'Design') return `${prefix}Designer`;
        if (businessArea === 'Data/Analytics') return `${prefix}Data Analyst`;
    }
    
    if (vertical === 'business') {
        if (businessArea === 'Finance') return `Finance Manager`;
        if (businessArea === 'Recruiting') return `Talent Lead`;
        if (businessArea === 'Marketing') return `Marketing Manager`;
        if (businessArea === 'Sales') return `Account Manager`;
    }
    
    return `${prefix}${businessArea} Specialist`;
}

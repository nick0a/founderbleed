export type RoleTier = "senior" | "junior" | "ea";
export type RoleVertical = "engineering" | "business" | null;

export interface RoleTask {
  task: string;
  hoursPerWeek: number;
}

export interface RoleRecommendation {
  id: string;
  roleTitle: string;
  roleTier: RoleTier;
  vertical: RoleVertical;
  businessArea: string;
  hoursPerWeek: number;
  costWeekly: number;
  costMonthly: number;
  costAnnual: number;
  tasks: RoleTask[];
  jdText: string;
}

export interface TierRates {
  seniorEngineeringRate: number;
  seniorBusinessRate: number;
  juniorEngineeringRate: number;
  juniorBusinessRate: number;
  eaRate: number;
}

interface InputEvent {
  title: string;
  finalTier: string | null;
  businessArea: string | null;
  vertical: string | null;
  durationMinutes: number;
}

const MIN_WEEKLY_HOURS = 8;
const MAX_WEEKLY_HOURS = 40;

function normalizeTier(tier: string | null | undefined): RoleTier | null {
  if (!tier) return null;
  const normalized = tier.toLowerCase();
  if (normalized === "senior") return "senior";
  if (normalized === "junior") return "junior";
  if (normalized === "ea") return "ea";
  return null;
}

function normalizeVertical(vertical: string | null | undefined): RoleVertical {
  if (!vertical) return "business";
  return vertical.toLowerCase() === "engineering" ? "engineering" : "business";
}

function normalizeArea(area: string | null | undefined): string {
  return area && area.trim().length > 0 ? area : "Operations";
}

function clampHours(hours: number): number {
  if (!Number.isFinite(hours)) return MIN_WEEKLY_HOURS;
  return Math.min(MAX_WEEKLY_HOURS, Math.max(MIN_WEEKLY_HOURS, Math.ceil(hours)));
}

function calculateRoleCosts(
  tier: RoleTier,
  vertical: RoleVertical,
  hoursPerWeek: number,
  rates: TierRates
) {
  const annualRate =
    tier === "ea"
      ? rates.eaRate
      : tier === "senior"
        ? vertical === "engineering"
          ? rates.seniorEngineeringRate
          : rates.seniorBusinessRate
        : vertical === "engineering"
          ? rates.juniorEngineeringRate
          : rates.juniorBusinessRate;

  const costAnnual = annualRate * (hoursPerWeek / 40);
  const costWeekly = costAnnual / 52;
  const costMonthly = costWeekly * 4.33;

  return {
    costAnnual: Math.round(costAnnual),
    costWeekly: Math.round(costWeekly),
    costMonthly: Math.round(costMonthly),
  };
}

function buildTasks(events: InputEvent[], weeklyMultiplier: number): RoleTask[] {
  const taskMap = new Map<string, number>();

  for (const event of events) {
    const title = event.title?.trim() || "Untitled";
    const hours = (event.durationMinutes || 0) / 60 * weeklyMultiplier;
    if (!Number.isFinite(hours) || hours <= 0) continue;
    taskMap.set(title, (taskMap.get(title) || 0) + hours);
  }

  return Array.from(taskMap.entries())
    .map(([task, hours]) => ({
      task,
      hoursPerWeek: Math.round(hours * 10) / 10,
    }))
    .sort((a, b) => b.hoursPerWeek - a.hoursPerWeek)
    .slice(0, 10);
}

function buildResponsibilities(tasks: RoleTask[]): string[] {
  return tasks.slice(0, 3).map((task) => `Own ${task.task}`);
}

function buildSkills(businessArea: string, vertical: RoleVertical): string[] {
  const area = businessArea.toLowerCase();

  if (vertical === "engineering") {
    if (area.includes("design")) return ["UI/UX design", "Prototyping", "Design systems"];
    if (area.includes("data")) return ["Data analysis", "SQL", "Dashboarding"];
    return ["Software development", "Code review", "Delivery planning"];
  }

  if (area.includes("marketing")) return ["Campaign planning", "Content strategy", "Analytics"];
  if (area.includes("sales")) return ["Pipeline management", "Customer outreach", "CRM hygiene"];
  if (area.includes("finance")) return ["Budgeting", "Accounting operations", "Financial reporting"];
  if (area.includes("recruit")) return ["Sourcing", "Interview coordination", "Talent ops"];

  return ["Process management", "Stakeholder communication", "Execution follow-through"];
}

function buildCandidateProfile(tier: RoleTier, vertical: RoleVertical): string {
  if (tier === "ea") {
    return "Organized, detail-oriented support partner who thrives in fast-paced schedules.";
  }

  if (tier === "senior") {
    return vertical === "engineering"
      ? "Experienced specialist who can lead projects end-to-end with minimal oversight."
      : "Senior operator who can own outcomes and collaborate across teams.";
  }

  return vertical === "engineering"
    ? "Early-career technical teammate eager to execute and learn quickly."
    : "Operations-focused teammate who keeps the business moving.";
}

function generateRoleTitle(
  tier: RoleTier,
  vertical: RoleVertical,
  businessArea: string
): string {
  if (tier === "ea") return "Executive Assistant";

  const area = businessArea.toLowerCase();

  if (tier === "senior" && vertical === "engineering") {
    if (area.includes("design")) return "Senior Designer";
    if (area.includes("data")) return "Senior Data Analyst";
    if (area.includes("development")) return "Senior Developer";
    return "Senior Engineer";
  }

  if (tier === "senior" && vertical === "business") {
    if (area.includes("finance")) return "Finance Manager";
    if (area.includes("marketing")) return "Marketing Manager";
    if (area.includes("sales")) return "Account Manager";
    if (area.includes("recruit") || area.includes("executive")) return "Talent Lead";
    if (area.includes("partnership")) return "Partnerships Manager";
    return "Operations Manager";
  }

  if (tier === "junior" && vertical === "engineering") {
    if (area.includes("development")) return "Junior Developer";
    if (area.includes("design")) return "Junior Designer";
    if (area.includes("data")) return "Junior Data Analyst";
    return "Technical Coordinator";
  }

  if (tier === "junior" && vertical === "business") {
    if (area.includes("consolidated") || area.includes("operations")) {
      return "Operations Coordinator";
    }
    return "Business Coordinator";
  }

  return "Operations Coordinator";
}

export function buildJobDescription(role: RoleRecommendation): string {
  const employmentType =
    role.hoursPerWeek >= 40
      ? "Full-time (40 hours/week)"
      : `Part-time (${role.hoursPerWeek} hours/week)`;

  const responsibilities = buildResponsibilities(role.tasks);
  const skills = buildSkills(role.businessArea, role.vertical);
  const candidateProfile = buildCandidateProfile(role.roleTier, role.vertical);

  return `# ${role.roleTitle}

**Employment Type:** ${employmentType}
**Tier:** ${role.roleTier.toUpperCase()}
**Vertical:** ${role.vertical ?? "N/A"}
**Business Area:** ${role.businessArea}
**Estimated Cost:** $${role.costWeekly}/week | $${role.costMonthly}/month | $${role.costAnnual}/year

## Tasks You Will Take Over
*Based on your calendar audit*

${role.tasks.length > 0
  ? role.tasks.map((task) => `- ${task.task} (${task.hoursPerWeek} hours/week)`).join("\n")
  : "- Calendar support and recurring operations tasks"}

## Key Responsibilities

${responsibilities.length > 0
  ? responsibilities.map((item) => `- ${item}`).join("\n")
  : "- Drive outcomes across assigned business priorities"}

## Required Skills

${skills.map((skill) => `- ${skill}`).join("\n")}

## Ideal Candidate Profile

${candidateProfile}
`;
}

function createRole(
  idSeed: string,
  tier: RoleTier,
  vertical: RoleVertical,
  businessArea: string,
  clusterEvents: InputEvent[],
  weeklyHours: number,
  weeklyMultiplier: number,
  rates: TierRates
): RoleRecommendation {
  const hoursPerWeek = clampHours(weeklyHours);
  const costs = calculateRoleCosts(tier, vertical, hoursPerWeek, rates);
  const tasks = buildTasks(clusterEvents, weeklyMultiplier);
  const roleTitle = generateRoleTitle(tier, vertical, businessArea);

  const recommendation: RoleRecommendation = {
    id: idSeed,
    roleTitle,
    roleTier: tier,
    vertical,
    businessArea,
    hoursPerWeek,
    costWeekly: costs.costWeekly,
    costMonthly: costs.costMonthly,
    costAnnual: costs.costAnnual,
    tasks,
    jdText: "",
  };

  recommendation.jdText = buildJobDescription(recommendation);
  return recommendation;
}

function mergeRoles(
  roles: RoleRecommendation[],
  rates: TierRates
): RoleRecommendation {
  const aggregatedTasks: RoleTask[] = [];
  const taskMap = new Map<string, number>();
  const tierCounts: Record<RoleTier, number> = { senior: 0, junior: 0, ea: 0 };
  const verticalCounts: Record<"engineering" | "business", number> = {
    engineering: 0,
    business: 0,
  };

  let totalHours = 0;

  for (const role of roles) {
    totalHours += role.hoursPerWeek;
    tierCounts[role.roleTier] += 1;
    if (role.vertical) verticalCounts[role.vertical] += 1;
    for (const task of role.tasks) {
      taskMap.set(task.task, (taskMap.get(task.task) || 0) + task.hoursPerWeek);
    }
  }

  for (const [task, hours] of taskMap.entries()) {
    aggregatedTasks.push({ task, hoursPerWeek: Math.round(hours * 10) / 10 });
  }

  aggregatedTasks.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  const tier: RoleTier =
    tierCounts.senior >= tierCounts.junior && tierCounts.senior >= tierCounts.ea
      ? "senior"
      : tierCounts.junior >= tierCounts.ea
        ? "junior"
        : "ea";

  const vertical: RoleVertical =
    tier === "ea"
      ? null
      : verticalCounts.engineering >= verticalCounts.business
        ? "engineering"
        : "business";

  const hoursPerWeek = clampHours(totalHours);
  const costs = calculateRoleCosts(tier, vertical, hoursPerWeek, rates);

  const recommendation: RoleRecommendation = {
    id: "role-consolidated",
    roleTitle: generateRoleTitle(tier, vertical, "Consolidated"),
    roleTier: tier,
    vertical,
    businessArea: "Consolidated",
    hoursPerWeek,
    costWeekly: costs.costWeekly,
    costMonthly: costs.costMonthly,
    costAnnual: costs.costAnnual,
    tasks: aggregatedTasks.slice(0, 10),
    jdText: "",
  };

  recommendation.jdText = buildJobDescription(recommendation);
  return recommendation;
}

export function generateRoleRecommendations(
  events: InputEvent[],
  auditDays: number,
  rates: TierRates
): RoleRecommendation[] {
  const normalizedDays = Math.max(1, auditDays);
  const weeklyMultiplier = 7 / normalizedDays;

  const clusters = new Map<string, InputEvent[]>();
  const consolidationBuckets: Record<RoleTier, InputEvent[]> = {
    senior: [],
    junior: [],
    ea: [],
  };

  for (const event of events) {
    const tier = normalizeTier(event.finalTier);
    if (!tier) continue;

    if (tier === "ea") {
      consolidationBuckets.ea.push(event);
      continue;
    }

    const area = normalizeArea(event.businessArea);
    const key = `${tier}:${area}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(event);
  }

  const recommendations: RoleRecommendation[] = [];

  for (const [key, clusterEvents] of clusters.entries()) {
    const [tierValue, area] = key.split(":");
    const tier = tierValue as RoleTier;
    const totalHours = clusterEvents.reduce(
      (sum, event) => sum + (event.durationMinutes || 0) / 60,
      0
    );
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= MIN_WEEKLY_HOURS) {
      const vertical = normalizeVertical(clusterEvents[0]?.vertical);
      recommendations.push(
        createRole(
          `role-${tier}-${area.replace(/\s+/g, "-").toLowerCase()}`,
          tier,
          vertical,
          area,
          clusterEvents,
          weeklyHours,
          weeklyMultiplier,
          rates
        )
      );
    } else {
      consolidationBuckets[tier].push(...clusterEvents);
    }
  }

  for (const [tier, bucketEvents] of Object.entries(consolidationBuckets)) {
    if (bucketEvents.length === 0) continue;
    const totalHours = bucketEvents.reduce(
      (sum, event) => sum + (event.durationMinutes || 0) / 60,
      0
    );
    const weeklyHours = totalHours * weeklyMultiplier;

    if (weeklyHours >= MIN_WEEKLY_HOURS) {
      const vertical =
        tier === "ea" ? null : normalizeVertical(bucketEvents[0]?.vertical);
      const area = tier === "ea" ? "Executive Assistant" : "Consolidated";
      recommendations.push(
        createRole(
          `role-${tier}-consolidated`,
          tier as RoleTier,
          vertical,
          area,
          bucketEvents,
          weeklyHours,
          weeklyMultiplier,
          rates
        )
      );
    }
  }

  recommendations.sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);

  if (recommendations.length > 5) {
    const primary = recommendations.slice(0, 4);
    const merged = mergeRoles(recommendations.slice(4), rates);
    return [...primary, merged];
  }

  return recommendations;
}

export function recalculateRole(
  role: RoleRecommendation,
  rates: TierRates
): RoleRecommendation {
  const hoursTotal = role.tasks.reduce(
    (sum, task) => sum + (task.hoursPerWeek || 0),
    0
  );
  const hoursPerWeek = clampHours(hoursTotal);
  const costs = calculateRoleCosts(role.roleTier, role.vertical, hoursPerWeek, rates);
  const updated = {
    ...role,
    hoursPerWeek,
    costWeekly: costs.costWeekly,
    costMonthly: costs.costMonthly,
    costAnnual: costs.costAnnual,
  };

  return {
    ...updated,
    jdText: buildJobDescription(updated),
  };
}

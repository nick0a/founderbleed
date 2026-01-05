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
  startAt?: Date;
  endAt?: Date;
}

type TierKey = "unique" | "founder" | "senior" | "junior" | "ea";

const TIER_PRIORITY: Record<TierKey, number> = {
  unique: 4,
  founder: 3,
  senior: 2,
  junior: 1,
  ea: 0,
};

function normalizeTier(tier: string): TierKey {
  const normalized = tier.toLowerCase();
  if (normalized === "unique") return "unique";
  if (normalized === "founder") return "founder";
  if (normalized === "junior") return "junior";
  if (normalized === "ea") return "ea";
  return "senior";
}

function allocateHours(events: Event[]) {
  const hoursByTier: Record<TierKey, number> = {
    unique: 0,
    founder: 0,
    senior: 0,
    junior: 0,
    ea: 0,
  };

  type Point = { time: number; type: "start" | "end"; tier: TierKey };
  const points: Point[] = [];

  for (const event of events) {
    if (event.isLeave) continue;

    const tier = normalizeTier(event.finalTier || "senior");
    const startMs = event.startAt?.getTime();
    const endMs = event.endAt?.getTime();

    if (
      typeof startMs === "number" &&
      typeof endMs === "number" &&
      endMs > startMs
    ) {
      points.push({ time: startMs, type: "start", tier });
      points.push({ time: endMs, type: "end", tier });
    } else {
      hoursByTier[tier] += event.durationMinutes / 60;
    }
  }

  if (points.length > 0) {
    points.sort((a, b) =>
      a.time === b.time
        ? a.type === "end"
          ? -1
          : 1
        : a.time - b.time
    );

    const active: Record<TierKey, number> = {
      unique: 0,
      founder: 0,
      senior: 0,
      junior: 0,
      ea: 0,
    };

    let prevTime = points[0].time;

    for (const point of points) {
      if (point.time > prevTime) {
        const activeTier = (Object.keys(active) as TierKey[])
          .filter((tier) => active[tier] > 0)
          .sort((a, b) => TIER_PRIORITY[b] - TIER_PRIORITY[a])[0];

        if (activeTier) {
          const minutes = (point.time - prevTime) / (1000 * 60);
          hoursByTier[activeTier] += minutes / 60;
        }
      }

      active[point.tier] += point.type === "start" ? 1 : -1;
      prevTime = point.time;
    }
  }

  return hoursByTier;
}

export function calculateMetrics(
  events: Event[],
  userRates: UserRates,
  auditDays: number
): AuditMetrics {
  const workEvents = events.filter((event) => !event.isLeave);
  const hoursByTier = allocateHours(workEvents);

  const totalHours = Object.values(hoursByTier).reduce(
    (sum, value) => sum + value,
    0
  );
  const workingDays = Math.max(auditDays, 1);

  let founderCostTotal: number | null = null;
  if (userRates.salaryAnnual !== null) {
    let annualFounderCost = userRates.salaryAnnual;

    if (
      userRates.equityPercentage !== null &&
      userRates.companyValuation !== null &&
      userRates.vestingPeriodYears !== null &&
      userRates.vestingPeriodYears > 0
    ) {
      const equityValue =
        (userRates.companyValuation * userRates.equityPercentage) /
        100 /
        userRates.vestingPeriodYears;
      annualFounderCost += equityValue;
    }

    const hourlyRate = annualFounderCost / 2080;
    founderCostTotal = hourlyRate * totalHours;
  }

  const seniorHours = hoursByTier.senior;
  const juniorHours = hoursByTier.junior;
  const eaHours = hoursByTier.ea;

  const seniorRate =
    (userRates.seniorEngineeringRate + userRates.seniorBusinessRate) / 2 / 2080;
  const juniorRate =
    (userRates.juniorEngineeringRate + userRates.juniorBusinessRate) / 2 / 2080;
  const eaRate = userRates.eaRate / 2080;

  const delegatedCostTotal =
    seniorHours * seniorRate + juniorHours * juniorRate + eaHours * eaRate;

  let arbitrage: number | null = null;
  if (founderCostTotal !== null) {
    arbitrage = founderCostTotal - delegatedCostTotal;
  }

  const highValueHours = hoursByTier.unique + hoursByTier.founder;
  const efficiencyScore = totalHours > 0
    ? Math.round((highValueHours / totalHours) * 100)
    : 0;

  const weeklyHours = totalHours > 0 ? totalHours / (workingDays / 7) : 0;
  const delegableHours = hoursByTier.senior + hoursByTier.junior + hoursByTier.ea;
  const reclaimableHours = totalHours > 0
    ? (delegableHours / totalHours) * weeklyHours
    : 0;

  return {
    totalHours,
    workingDays,
    hoursByTier,
    founderCostTotal,
    delegatedCostTotal,
    arbitrage,
    efficiencyScore,
    reclaimableHours: Math.round(reclaimableHours * 10) / 10,
  };
}

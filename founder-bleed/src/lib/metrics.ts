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

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
  if (userRates.salaryAnnual !== null && !isNaN(userRates.salaryAnnual)) {
    let annualFounderCost = userRates.salaryAnnual;

    // Add equity value if provided
    if (
      userRates.equityPercentage !== null &&
      userRates.companyValuation !== null &&
      userRates.vestingPeriodYears !== null &&
      userRates.vestingPeriodYears > 0 &&
      !isNaN(userRates.equityPercentage) &&
      !isNaN(userRates.companyValuation) &&
      !isNaN(userRates.vestingPeriodYears)
    ) {
      const equityValue = (userRates.companyValuation * userRates.equityPercentage / 100) / userRates.vestingPeriodYears;
      annualFounderCost += equityValue;
    }

    const hourlyRate = annualFounderCost / 2080;
    founderCostTotal = hourlyRate * totalHours;
    
    // Ensure no NaN
    if (isNaN(founderCostTotal)) {
      founderCostTotal = null;
    }
  }

  // Calculate delegated cost
  const seniorHours = hoursByTier.senior;
  const juniorHours = hoursByTier.junior;
  const eaHours = hoursByTier.ea;

  // Use average of engineering/business rates for simplicity
  // In practice, you'd use the event's vertical to determine which rate
  const seniorRate = ((userRates.seniorEngineeringRate || 100000) + (userRates.seniorBusinessRate || 80000)) / 2 / 2080;
  const juniorRate = ((userRates.juniorEngineeringRate || 40000) + (userRates.juniorBusinessRate || 50000)) / 2 / 2080;
  const eaRate = (userRates.eaRate || 25000) / 2080;

  const delegatedCostTotal = (seniorHours * seniorRate) + (juniorHours * juniorRate) + (eaHours * eaRate);

  // Calculate arbitrage
  let arbitrage: number | null = null;
  if (founderCostTotal !== null) {
    arbitrage = founderCostTotal - delegatedCostTotal;
    // Ensure no NaN
    if (isNaN(arbitrage)) {
      arbitrage = null;
    }
  }

  // Efficiency score: % of time on Unique + Founder work
  const highValueHours = hoursByTier.unique + hoursByTier.founder;
  const efficiencyScore = totalHours > 0
    ? Math.round((highValueHours / totalHours) * 100)
    : 0;

  // Reclaimable hours (delegable work per week)
  let reclaimableHours = 0;
  if (totalHours > 0 && auditDays > 0) {
    const weeklyHours = totalHours / (auditDays / 7);
    reclaimableHours = ((hoursByTier.senior + hoursByTier.junior + hoursByTier.ea) / totalHours) * weeklyHours;
    reclaimableHours = Math.round(reclaimableHours * 10) / 10;
    
    // Ensure no NaN
    if (isNaN(reclaimableHours)) {
      reclaimableHours = 0;
    }
  }

  return {
    totalHours: isNaN(totalHours) ? 0 : totalHours,
    workingDays,
    hoursByTier,
    founderCostTotal,
    delegatedCostTotal: isNaN(delegatedCostTotal) ? 0 : delegatedCostTotal,
    arbitrage,
    efficiencyScore: isNaN(efficiencyScore) ? 0 : efficiencyScore,
    reclaimableHours
  };
}
// Metrics Calculation for Founder Bleed
// Calculates Founder Cost, Delegated Cost, Arbitrage, Efficiency Score

import type { Tier, Vertical } from './classification';

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
  founderCostTotal: number | null; // null if salary not set - NEVER NaN
  delegatedCostTotal: number | null;
  arbitrage: number | null; // null if salary not set - NEVER NaN
  efficiencyScore: number; // 0-100
  reclaimableHours: number;
  reclaimableHoursWeekly: number;
}

export interface UserRates {
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

export interface MetricsEvent {
  durationMinutes: number;
  finalTier: string | null;
  vertical: string | null;
  isLeave: boolean;
}

// Standard working hours per year
const WORKING_HOURS_PER_YEAR = 2080;

export function calculateMetrics(
  events: MetricsEvent[],
  userRates: UserRates,
  auditDays: number
): AuditMetrics {
  // Filter out leave events
  const workEvents = events.filter((e) => !e.isLeave);

  // Calculate hours by tier
  const hoursByTier = {
    unique: 0,
    founder: 0,
    senior: 0,
    junior: 0,
    ea: 0,
  };

  for (const event of workEvents) {
    const hours = event.durationMinutes / 60;
    const tier = (event.finalTier || 'senior') as Tier;
    if (tier in hoursByTier) {
      hoursByTier[tier] += hours;
    }
  }

  const totalHours = Object.values(hoursByTier).reduce((a, b) => a + b, 0);
  const workingDays = Math.max(auditDays, 1);

  // Calculate founder cost (CRITICAL: return null, not NaN or 0, if salary not set)
  let founderCostTotal: number | null = null;

  if (userRates.salaryAnnual !== null && userRates.salaryAnnual > 0) {
    let annualFounderCost = userRates.salaryAnnual;

    // Add equity value if all required fields are provided
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

    const hourlyRate = annualFounderCost / WORKING_HOURS_PER_YEAR;
    founderCostTotal = hourlyRate * totalHours;

    // Ensure we never return NaN
    if (!Number.isFinite(founderCostTotal)) {
      founderCostTotal = null;
    }
  }

  // Calculate delegated cost per event using vertical-specific rates
  let delegatedCostTotal = 0;

  for (const event of workEvents) {
    const hours = event.durationMinutes / 60;
    const tier = (event.finalTier || 'senior') as Tier;
    const vertical = (event.vertical || 'business') as Vertical;

    let hourlyRate = 0;

    switch (tier) {
      case 'senior':
        hourlyRate =
          vertical === 'engineering'
            ? userRates.seniorEngineeringRate / WORKING_HOURS_PER_YEAR
            : userRates.seniorBusinessRate / WORKING_HOURS_PER_YEAR;
        break;
      case 'junior':
        hourlyRate =
          vertical === 'engineering'
            ? userRates.juniorEngineeringRate / WORKING_HOURS_PER_YEAR
            : userRates.juniorBusinessRate / WORKING_HOURS_PER_YEAR;
        break;
      case 'ea':
        hourlyRate = userRates.eaRate / WORKING_HOURS_PER_YEAR;
        break;
      case 'unique':
      case 'founder':
        // Non-delegable work - use founder's rate for comparison
        if (userRates.salaryAnnual !== null) {
          hourlyRate = userRates.salaryAnnual / WORKING_HOURS_PER_YEAR;
        }
        break;
    }

    delegatedCostTotal += hours * hourlyRate;
  }

  // Ensure delegated cost is not NaN
  if (!Number.isFinite(delegatedCostTotal)) {
    delegatedCostTotal = 0;
  }

  // Calculate arbitrage (CRITICAL: return null if founder cost is null)
  let arbitrage: number | null = null;
  if (founderCostTotal !== null) {
    arbitrage = founderCostTotal - delegatedCostTotal;
    // Ensure we never return NaN
    if (!Number.isFinite(arbitrage)) {
      arbitrage = null;
    }
  }

  // Efficiency score: % of time on Unique + Founder work (always 0-100)
  const highValueHours = hoursByTier.unique + hoursByTier.founder;
  let efficiencyScore = 0;
  if (totalHours > 0) {
    efficiencyScore = Math.round((highValueHours / totalHours) * 100);
    // Clamp to 0-100
    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));
  }

  // Reclaimable hours (delegable work in the audit period)
  const delegableHours =
    hoursByTier.senior + hoursByTier.junior + hoursByTier.ea;
  const reclaimableHours = Math.round(delegableHours * 10) / 10;

  // Reclaimable hours per week
  const weeksInPeriod = auditDays / 7;
  const reclaimableHoursWeekly =
    weeksInPeriod > 0
      ? Math.round((delegableHours / weeksInPeriod) * 10) / 10
      : 0;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    workingDays,
    hoursByTier: {
      unique: Math.round(hoursByTier.unique * 10) / 10,
      founder: Math.round(hoursByTier.founder * 10) / 10,
      senior: Math.round(hoursByTier.senior * 10) / 10,
      junior: Math.round(hoursByTier.junior * 10) / 10,
      ea: Math.round(hoursByTier.ea * 10) / 10,
    },
    founderCostTotal:
      founderCostTotal !== null ? Math.round(founderCostTotal * 100) / 100 : null,
    delegatedCostTotal: Math.round(delegatedCostTotal * 100) / 100,
    arbitrage: arbitrage !== null ? Math.round(arbitrage * 100) / 100 : null,
    efficiencyScore,
    reclaimableHours,
    reclaimableHoursWeekly,
  };
}

// Helper to get hourly rate from annual salary
export function getHourlyRate(annualSalary: number | null): number | null {
  if (annualSalary === null || annualSalary <= 0) return null;
  const rate = annualSalary / WORKING_HOURS_PER_YEAR;
  return Number.isFinite(rate) ? rate : null;
}

// Format currency for display
export function formatCurrency(
  value: number | null,
  currency: string = 'USD'
): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format hours for display
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  return `${Math.round(hours * 10) / 10}hrs`;
}

// Calculate percentage breakdown by tier
export function calculateTierPercentages(hoursByTier: AuditMetrics['hoursByTier']): Record<Tier, number> {
  const total = Object.values(hoursByTier).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { unique: 0, founder: 0, senior: 0, junior: 0, ea: 0 };
  }

  return {
    unique: Math.round((hoursByTier.unique / total) * 100),
    founder: Math.round((hoursByTier.founder / total) * 100),
    senior: Math.round((hoursByTier.senior / total) * 100),
    junior: Math.round((hoursByTier.junior / total) * 100),
    ea: Math.round((hoursByTier.ea / total) * 100),
  };
}

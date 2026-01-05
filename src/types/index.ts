// Core type definitions for Founder Bleed

// Tier types
export type Tier = 'unique' | 'founder' | 'senior' | 'junior' | 'ea';

// Tier rates (annual salary)
export const TIER_RATES: Record<Tier, number> = {
  unique: 0, // Founder's rate (calculated dynamically)
  founder: 0, // Founder's rate (calculated dynamically)
  senior: 100000,
  junior: 50000,
  ea: 30000,
};

// Working hours per year
export const WORKING_HOURS_PER_YEAR = 2080;

// Calculate hourly rate from annual salary
export function calculateHourlyRate(annualSalary: number): number {
  return annualSalary / WORKING_HOURS_PER_YEAR;
}

// Team composition
export interface TeamComposition {
  founder: number;
  seniorEngineering: number;
  juniorEngineering: number;
  seniorBusiness: number;
  juniorBusiness: number;
  ea: number;
}

// User profile
export interface UserProfile {
  id: string;
  userId: string;
  salary: number | null;
  equityValue: number | null;
  currency: string;
  teamComposition: TeamComposition;
  timezone: string | null;
}

// Audit types
export type AuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AuditResults {
  totalHours: number;
  tierBreakdown: Record<Tier, number>;
  founderCost: number | null;
  delegatedCost: number;
  arbitrage: number | null;
  efficiencyScore: number;
  planningScore: number;
}

// Subscription types
export type SubscriptionPlan = 'free' | 'starter' | 'team' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

// Algorithm version
export const ALGORITHM_VERSION = '1.7';

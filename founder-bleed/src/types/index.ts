// TypeScript types will be added as needed throughout the build phases
// This file is created as part of Phase 0 setup

export type Tier = 'unique' | 'founder' | 'senior' | 'junior' | 'ea';

export type Vertical = 'universal' | 'technical' | 'business';

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface TeamComposition {
  founder: number;
  senior?: number;
  junior?: number;
  ea?: number;
}
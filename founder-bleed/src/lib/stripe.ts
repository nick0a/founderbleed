import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe integration will not work');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-12-15.clover',
});

export function getPriceId(tier: string, billingPeriod: 'monthly' | 'annual'): string | null {
  // Map tier names to env var names (enterprise -> team for backwards compatibility)
  const tierMap: Record<string, string> = {
    'starter': 'STARTER',
    'pro': 'PRO',
    'enterprise': 'TEAM', // Enterprise tier uses TEAM price IDs
  };
  const envTier = tierMap[tier.toLowerCase()] || tier.toUpperCase();
  const envKey = `STRIPE_PRICE_ID_${envTier}_${billingPeriod.toUpperCase()}`;
  return process.env[envKey] || null;
}

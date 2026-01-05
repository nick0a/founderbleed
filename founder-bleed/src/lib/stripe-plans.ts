export const STRIPE_PRICE_MAP = {
  starter: {
    monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
    annual: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ID_TEAM_MONTHLY,
    annual: process.env.STRIPE_PRICE_ID_TEAM_ANNUAL,
  },
} as const;

export const LLM_BUDGET_CENTS: Record<string, number> = {
  starter: 300,
  pro: 750,
  enterprise: 1350,
};

export function getPriceId(
  tier: keyof typeof STRIPE_PRICE_MAP,
  billingPeriod: "monthly" | "annual"
) {
  return STRIPE_PRICE_MAP[tier]?.[billingPeriod] || null;
}

export function resolveTierFromPrice(priceId: string) {
  const entries = Object.entries(STRIPE_PRICE_MAP) as Array<
    [keyof typeof STRIPE_PRICE_MAP, { monthly?: string; annual?: string }]
  >;

  for (const [tier, prices] of entries) {
    if (prices.monthly === priceId) {
      return { tier, billingPeriod: "monthly" as const };
    }
    if (prices.annual === priceId) {
      return { tier, billingPeriod: "annual" as const };
    }
  }

  return null;
}

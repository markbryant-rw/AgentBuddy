// Stripe Plan Configuration
// To update prices: Archive old price in Stripe Dashboard, create new price, update ID here

export const STRIPE_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    productId: null, // Free tier - no Stripe product
    priceMonthly: null,
    priceAnnual: null,
    amountMonthly: 0,
    amountAnnual: 0,
    currency: 'NZD',
    aiCredits: 0,
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    productId: 'prod_TYO0104mabNKS4',
    priceMonthly: 'price_1SbHE2DXjWR7yUDdT4z1hGoP',
    priceAnnual: 'price_1SbHESDXjWR7yUDdugYa3Exi',
    amountMonthly: 9.99,
    amountAnnual: 95.88,
    currency: 'NZD',
    aiCredits: 500,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    productId: 'prod_TYO1xvQOTUEfks',
    priceMonthly: 'price_1SbHFQDXjWR7yUDdFEdw8Eyq',
    priceAnnual: 'price_1SbHFaDXjWR7yUDdltznFNbz',
    amountMonthly: 29,
    amountAnnual: 278.40,
    currency: 'NZD',
    aiCredits: 2000,
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

// Helper to get plan by Stripe product ID
export function getPlanByProductId(productId: string | null): PlanId {
  if (!productId) return 'starter';
  
  const entry = Object.entries(STRIPE_PLANS).find(
    ([_, plan]) => plan.productId === productId
  );
  
  return (entry?.[0] as PlanId) || 'starter';
}

// Helper to get price ID based on billing cycle
export function getPriceId(planId: PlanId, isAnnual: boolean): string | null {
  const plan = STRIPE_PLANS[planId];
  return isAnnual ? plan.priceAnnual : plan.priceMonthly;
}

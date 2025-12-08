// Stripe Plan Configuration
// Updated: December 2024 - New pricing structure

export const STRIPE_PLANS = {
  solo: {
    id: 'solo',
    name: 'Solo Agent',
    productId: 'prod_TZ4A0HrJuZxQJa',
    priceMonthly: 'price_1Sbw1yDXjWR7yUDd5cOjm05d',
    priceAnnual: 'price_1Sbw1zDXjWR7yUDdHi98PXqQ',
    amountMonthly: 49.99,
    amountAnnual: 499.90,
    currency: 'NZD',
    description: 'Everything you need as an individual agent',
  },
  team: {
    id: 'team',
    name: 'Small Team',
    productId: 'prod_TZ4An7JchtyYF1',
    priceMonthly: 'price_1Sbw21DXjWR7yUDdGRwqRrSC',
    priceAnnual: 'price_1Sbw23DXjWR7yUDdULERHgLT',
    amountMonthly: 99.99,
    amountAnnual: 999.90,
    currency: 'NZD',
    description: 'Perfect for agents with a team - up to 3 users',
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

// Helper to get plan by Stripe product ID
export function getPlanByProductId(productId: string | null): PlanId | null {
  if (!productId) return null;
  
  const entry = Object.entries(STRIPE_PLANS).find(
    ([_, plan]) => plan.productId === productId
  );
  
  return (entry?.[0] as PlanId) || null;
}

// Helper to get price ID based on billing cycle
export function getPriceId(planId: PlanId, isAnnual: boolean): string {
  const plan = STRIPE_PLANS[planId];
  return isAnnual ? plan.priceAnnual : plan.priceMonthly;
}

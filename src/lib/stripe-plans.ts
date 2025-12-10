// Stripe Plan Configuration
// Updated: December 2024 - New pricing structure with seat management

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
    seats: 1,
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
    seats: 3,
  },
} as const;

// Extra seat product for purchasing additional team members
export const EXTRA_SEAT = {
  productId: 'prod_Ta6nXaftbBQApZ',
  priceId: 'price_1ScwaGDXjWR7yUDdDR6vCeg6',
  amountMonthly: 24.99,
  currency: 'NZD',
  name: 'Extra Team Seat',
  description: 'Add an additional team member',
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

// Helper to get base seats for a plan
export function getBaseSeatCount(planId: PlanId | null): number {
  if (!planId) return 0;
  return STRIPE_PLANS[planId]?.seats || 0;
}

// Calculate total available seats
export function calculateTotalSeats(
  planId: PlanId | null,
  extraSeats: number,
  licenseType: string | null
): number {
  if (licenseType === 'admin_unlimited') return 999;
  const baseSeats = getBaseSeatCount(planId);
  return baseSeats + (extraSeats || 0);
}

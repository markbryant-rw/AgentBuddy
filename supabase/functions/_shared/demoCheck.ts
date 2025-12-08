// Shared demo user detection utility
// Demo agency ID - must match the one in migrations
export const DEMO_AGENCY_ID = 'a0000000-0000-0000-0000-000000000001';
export const DEMO_USER_EMAIL = 'demo@agentbuddy.co';

export interface DemoCheckResult {
  isDemoUser: boolean;
  demoAgencyId: string;
}

export function isDemoEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === DEMO_USER_EMAIL;
}

export function createDemoResponse(message: string, mockData?: Record<string, any>) {
  return {
    success: true,
    demo: true,
    message,
    ...mockData,
  };
}

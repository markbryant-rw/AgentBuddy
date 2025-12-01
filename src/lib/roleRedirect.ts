import type { AppRole } from './rbac';

/**
 * Map of role to their management dashboard.
 * This is ONLY used by the role switcher, NOT for post-login redirects.
 * 
 * Workspace-first approach:
 * - All users land on /dashboard after login
 * - Users explicitly switch to role-specific dashboards via the role switcher
 */
const ROLE_DASHBOARD_MAP: Record<AppRole, string> = {
  platform_admin: '/platform-admin',
  office_manager: '/office-manager',
  team_leader: '/team-leader',
  salesperson: '/dashboard',
  assistant: '/dashboard',
};

/**
 * Gets the dashboard path for a specific role.
 * Used by the role switcher to navigate to role-specific management views.
 * NOT used for post-login redirects (all users go to /dashboard after login).
 */
export const getRoleBasedRedirect = (
  activeRole: AppRole | null,
  allRoles: AppRole[]
): string => {
  // Use active role if set
  if (activeRole && ROLE_DASHBOARD_MAP[activeRole]) {
    return ROLE_DASHBOARD_MAP[activeRole];
  }
  
  // Fallback to highest priority role
  // Priority order: platform_admin > office_manager > team_leader > salesperson > assistant
  if (allRoles.includes('platform_admin')) {
    return '/platform-admin';
  }
  
  if (allRoles.includes('office_manager')) {
    return '/office-manager';
  }
  
  if (allRoles.includes('team_leader')) {
    return '/team-leader';
  }
  
  if (allRoles.includes('salesperson')) {
    return '/dashboard';
  }
  
  if (allRoles.includes('assistant')) {
    return '/dashboard';
  }
  
  // Default fallback to dashboard if no specific role found
  return '/dashboard';
};

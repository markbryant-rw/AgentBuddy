import type { AppRole } from '@/lib/rbac';

export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  // Platform Admin Only
  '/admin': ['platform_admin'],
  '/admin/*': ['platform_admin'],
  '/platform-admin': ['platform_admin'],
  '/platform-admin/*': ['platform_admin'],
  
  // Office Manager and Above
  '/office-manager': ['platform_admin', 'office_manager'],
  '/office-manager/*': ['platform_admin', 'office_manager'],
  
  // Team Leader and Above
  '/team-leader': ['platform_admin', 'office_manager', 'team_leader'],
  '/team-leader/*': ['platform_admin', 'office_manager', 'team_leader'],
  
  // Team Management
  '/team-management': ['platform_admin', 'office_manager', 'team_leader'],
  '/team-management/*': ['platform_admin', 'office_manager', 'team_leader'],
  
  // Salesperson and Above
  '/sales': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/sales/*': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  
  // Salesperson Dashboard
  '/salesperson': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/salesperson/*': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  
  // Assistant Dashboard  
  '/assistant': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/assistant/*': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  
  // Invitation feature (based on who can invite)
  '/invite': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  
  // Transact workspace
  '/transact-dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/transaction-coordinating': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/stock-board': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/listing-expiry-report': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/past-sales-history': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  
  // Prospect workspace
  '/prospect-dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/logged-appraisals': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/listings-pipeline': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  
  // Operate workspace
  '/operate-dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/daily-planner': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/projects': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/tasks': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/systems/directory': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  
  // Grow workspace
  '/grow-dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/ai-coach': ['platform_admin', 'office_manager', 'team_leader', 'salesperson'],
  '/knowledge-base': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  
  // Engage workspace
  '/engage-dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/engage/leaderboards': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/engage/feed': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  
  // Social workspace (legacy)
  '/social': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/social/posts': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/social/friends': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/social/leaderboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  
  // General dashboard (everyone)
  '/dashboard': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/profile': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/settings': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  '/access-denied': ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
};

export const checkRouteAccess = (path: string, userRoles: AppRole[]): boolean => {
  // Check exact match first
  if (ROUTE_PERMISSIONS[path]) {
    return userRoles.some(role => ROUTE_PERMISSIONS[path].includes(role));
  }
  
  // Check wildcard patterns (e.g., /admin/* matches /admin/anything)
  const matchingRoute = Object.keys(ROUTE_PERMISSIONS).find(routePattern => {
    if (routePattern.endsWith('/*')) {
      const baseRoute = routePattern.slice(0, -2);
      return path.startsWith(baseRoute);
    }
    return false;
  });
  
  if (matchingRoute) {
    return userRoles.some(role => ROUTE_PERMISSIONS[matchingRoute].includes(role));
  }
  
  // If no match found, default to allowing (handled by ProtectedRoute)
  return true;
};

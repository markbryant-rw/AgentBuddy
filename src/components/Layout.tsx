import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouteRoleSync } from '@/hooks/useRouteRoleSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';
import { TaskNotificationBell } from '@/components/layout/TaskNotificationBell';
import { MessagesDropdown } from '@/components/MessagesDropdown';
import { UserMenuDropdown } from '@/components/UserMenuDropdown';
import { MobileMoreMenu } from '@/components/MobileMoreMenu';
import { ViewAsBanner } from '@/components/ViewAsBanner';
import { ImpersonationAlertBanner } from '@/components/ImpersonationAlertBanner';
import { useModuleUsageTracking } from '@/hooks/useModuleUsageTracking';
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer';
import { PomodoroProvider } from '@/contexts/PomodoroContext';
import { getWorkspaceItemsForActiveRole } from '@/lib/navigation';
import { RoleModeBadge } from '@/components/RoleModeBadge';
import { FloatingBugReportButton } from '@/components/feedback/FloatingBugReportButton';

const Layout = () => {
  const { roles, activeRole } = useAuth();
  const location = useLocation();
  const workspaceItems = getWorkspaceItemsForActiveRole(activeRole, roles);
  
  // Automatically sync active role when navigating to role-specific routes
  useRouteRoleSync();

  // Helper functions to check workspace paths
  const isInPlanWorkspace = (path: string) => {
    return path.includes('/plan-dashboard') || 
           path.includes('/kpi-tracker') || 
           path.includes('/weekly-logs');
  };

  const isInProspectWorkspace = (path: string) => {
    return path.includes('/prospect-dashboard') ||
           path.includes('/appraisal-import');
  };

  const isInTransactWorkspace = (path: string) => {
    return path.includes('/transact') || 
           path.includes('/transaction-management') ||
           path.includes('/stock-board') ||
           path.includes('/past-sales-history');
  };

  const isInOperateWorkspace = (path: string) => {
    return path.includes('/operate-dashboard') || 
           path.includes('/daily-planner') ||
           path.includes('/projects') ||
           path.includes('/tasks') ||
           path.includes('/vendor-reporting') ||
           path.includes('/messages') ||
           path.includes('/notes');
  };

  const isInGrowWorkspace = (path: string) => {
    return path.includes('/grow-dashboard') || 
           path.includes('/coaches-corner') || 
           path.includes('/knowledge-base') ||
           path.includes('/review-roadmap');
  };

  const isInEngageWorkspace = (path: string) => {
    return path.includes('/engage-dashboard') || 
           path.includes('/engage/leaderboards') ||
           path.includes('/engage/feed') ||
           path.includes('/systems/directory');
  };

  // Check if a nav item is active based on workspace detection
  const isNavItemActive = (itemPath: string, currentPath: string) => {
    // For workspace items, use workspace detection
    if (itemPath === '/plan-dashboard') return isInPlanWorkspace(currentPath);
    if (itemPath === '/prospect-dashboard') return isInProspectWorkspace(currentPath);
    if (itemPath === '/transact-dashboard') return isInTransactWorkspace(currentPath);
    if (itemPath === '/operate-dashboard') return isInOperateWorkspace(currentPath);
    if (itemPath === '/grow-dashboard') return isInGrowWorkspace(currentPath);
    if (itemPath === '/engage-dashboard') return isInEngageWorkspace(currentPath);
    
    // For non-workspace items (like /community), use simple path matching
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  // Map routes to module IDs for tracking
  const getModuleIdFromPath = (path: string): string | null => {
    const routeMap: Record<string, string> = {
      '/listing-pipeline': 'listing-pipeline',
      '/kpi-tracker': 'kpi-tracking',
      '/transaction-coordinating': 'transaction-management',
      '/role-playing': 'role-playing',
      '/community': 'people',
      '/engage-dashboard': 'engage',
      '/engage/leaderboards': 'engage',
      '/engage/feed': 'engage',
      '/vendor-reporting': 'vendor-reporting',
      '/nurture-calculator': 'nurture-calculator',
      '/coaches-corner': 'coaches-corner',
      '/feedback-centre': 'feature-request',
      '/listing-description': 'listing-description',
      '/messages': 'messages',
      '/tasks': 'task-manager',
      '/notes': 'notes',
      '/review-roadmap': 'review-roadmap',
      '/systems/directory': 'service-directory',
    };
    return routeMap[path] || null;
  };

  const currentModuleId = getModuleIdFromPath(location.pathname);
  useModuleUsageTracking(currentModuleId);

  return (
    // Phase 3: Wrap with PomodoroProvider to share session data across components
    <PomodoroProvider date={new Date()}>
      <div className="min-h-screen bg-background">
      <ViewAsBanner />
      <ImpersonationAlertBanner />
      <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to="/dashboard" 
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg hidden lg:inline">AgentBuddy</span>
            </Link>

            {/* Role Mode Badge - only show on role-specific dashboards */}
            {(['/platform-admin', '/office-manager', '/team-leader'].some(path => 
              location.pathname === path || location.pathname.startsWith(path + '/')
            )) && <RoleModeBadge role={activeRole} />}

            {/* Workspace Navigation */}
            <nav className="hidden md:flex items-center gap-3">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const isActive = isNavItemActive(item.path, location.pathname);
                
                return (
                  <Link 
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "group relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                      "flex items-center gap-2",
                      "hover:scale-105 hover:shadow-lg",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label.toUpperCase()}
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-2">
            <PomodoroTimer />
              
              {/* Messages Dropdown */}
              <MessagesDropdown />
              
              <TaskNotificationBell />
              <NotificationBell />
              <UserMenuDropdown />
            </div>
          </div>
        </div>
      </nav>

      <main className={cn(
        "px-4 md:px-6",
        location.pathname === '/messages' ? '' : 'py-8 pb-20 md:pb-8'
      )}>
        <Outlet />
      </main>

      {/* Floating Bug Report Button */}
      <FloatingBugReportButton />

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t">
        <div className="flex items-center h-16">
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item.path, location.pathname);
            return (
              <Link key={item.path} to={item.path} className="flex-1">
                <button
                  className={cn(
                    'w-full h-full flex flex-col items-center justify-center space-y-1 relative',
                    isActive && 'text-primary'
                  )}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 min-w-4 text-[10px] p-0 px-1">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs">{item.label}</span>
                </button>
              </Link>
            );
          })}
          <MobileMoreMenu />
        </div>
      </div>
    </div>
    </PomodoroProvider>
  );
};

export default Layout;

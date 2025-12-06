import type { AppRole } from './rbac';
import { 
  Home, 
  Shield, 
  Users, 
  UserPlus, 
  Building, 
  UsersRound,
  TrendingUp,
  ListChecks,
  MessageSquare,
  GraduationCap,
  Flame,
  FileText,
  Rocket,
  LayoutDashboard,
  Package,
  Calendar,
  Target,
  BarChart3,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: AppRole[];
  category: 'workspace' | 'management';
  badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'management',
  },
  {
    label: 'Admin Panel',
    path: '/admin',
    icon: Shield,
    roles: ['platform_admin'],
    category: 'management',
  },
  {
    label: 'Invite Users',
    path: '/invite',
    icon: UserPlus,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'management',
  },
  {
    label: 'Office Management',
    path: '/office-manager',
    icon: Building,
    roles: ['platform_admin', 'office_manager'],
    category: 'management',
  },
  {
    label: 'Team Dashboard',
    path: '/team-leader',
    icon: UsersRound,
    roles: ['platform_admin', 'office_manager', 'team_leader'],
    category: 'management',
  },
  {
    label: 'Sales Dashboard',
    path: '/salesperson',
    icon: TrendingUp,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'management',
  },
  {
    label: 'Assistant Dashboard',
    path: '/assistant',
    icon: ListChecks,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'management',
  },
  {
    label: 'Plan',
    path: '/plan-dashboard',
    icon: TrendingUp,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
  {
    label: 'Prospect',
    path: '/prospect-dashboard',
    icon: Flame,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
  {
    label: 'Transact',
    path: '/transact-dashboard',
    icon: FileText,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
  {
    label: 'Operate',
    path: '/operate-dashboard',
    icon: ListChecks,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
  {
    label: 'Grow',
    path: '/grow-dashboard',
    icon: Rocket,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
  {
    label: 'Engage',
    path: '/engage-dashboard',
    icon: MessageSquare,
    roles: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
    category: 'workspace',
  },
];

export const getNavigationItems = (userRoles: AppRole[]): NavItem[] => {
  return NAV_ITEMS.filter(item => 
    userRoles.some(role => item.roles.includes(role))
  );
};

export const getWorkspaceItems = (userRoles: AppRole[]): NavItem[] => {
  return NAV_ITEMS.filter(item => 
    item.category === 'workspace' && userRoles.some(role => item.roles.includes(role))
  );
};

export const getManagementItems = (userRoles: AppRole[]): NavItem[] => {
  return NAV_ITEMS.filter(item => 
    item.category === 'management' && userRoles.some(role => item.roles.includes(role))
  );
};

/**
 * Get navigation items filtered by the user's ACTIVE role perspective
 * This is the key function for role-based view switching
 */
export const getNavigationItemsForActiveRole = (
  activeRole: AppRole | null,
  allRoles: AppRole[]
): NavItem[] => {
  // Fallback to workspace items only if no active role set
  if (!activeRole) {
    return getWorkspaceItems(allRoles);
  }

  // Platform Admin, Office Manager, and Team Leader shouldn't use main header nav
  // They access their dashboards via role switcher
  // Only show workspace navigation
  return getWorkspaceItemsForActiveRole(activeRole, allRoles);
};

/**
 * Get workspace items for the active role
 * ONLY show workspace navigation for salesperson and assistant roles
 * Management roles (platform_admin, office_manager, team_leader) get their own dedicated views
 */
export const getWorkspaceItemsForActiveRole = (
  activeRole: AppRole | null,
  allRoles: AppRole[]
): NavItem[] => {
  if (!activeRole) {
    return getWorkspaceItems(allRoles);
  }

  // Only show workspace navigation for salesperson and assistant
  // Management roles have dedicated dashboards and shouldn't see workspace nav
  if (activeRole === 'salesperson' || activeRole === 'assistant') {
    return NAV_ITEMS.filter(
      item => 
        item.category === 'workspace' && 
        item.roles.includes(activeRole)
    );
  }

  // For all other roles (platform_admin, office_manager, team_leader), hide workspace nav
  return [];
};

/**
 * Get management items for the active role
 */
export const getManagementItemsForActiveRole = (
  activeRole: AppRole | null,
  allRoles: AppRole[]
): NavItem[] => {
  if (!activeRole) {
    return getManagementItems(allRoles);
  }

  return NAV_ITEMS.filter(
    item => 
      item.category === 'management' && 
      item.roles.includes(activeRole)
  );
};

/**
 * Platform Admin navigation items
 * These are only accessible to platform admins
 */
export const PLATFORM_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    path: '/platform-admin',
    icon: LayoutDashboard,
    roles: ['platform_admin'],
    category: 'management',
  },
  {
    label: 'Health Dashboard',
    path: '/platform-admin/health',
    icon: BarChart3,
    roles: ['platform_admin'],
    category: 'management',
  },
  {
    label: 'Offices',
    path: '/platform-admin/offices',
    icon: Building,
    roles: ['platform_admin'],
    category: 'management',
  },
  {
    label: 'Teams',
    path: '/platform-admin/teams',
    icon: UsersRound,
    roles: ['platform_admin'],
    category: 'management',
  },
  {
    label: 'Users',
    path: '/platform-admin/users',
    icon: Users,
    roles: ['platform_admin'],
    category: 'management',
  },
];

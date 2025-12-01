export type AppRole = 'platform_admin' | 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';

// Hierarchy: who can invite whom
const INVITATION_HIERARCHY: Record<AppRole, AppRole[]> = {
  platform_admin: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['team_leader', 'salesperson', 'assistant'],
  team_leader: ['salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};

// Hierarchy: who can change roles
const ROLE_CHANGE_HIERARCHY: Record<AppRole, AppRole[]> = {
  platform_admin: ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'],
  office_manager: ['office_manager', 'team_leader', 'salesperson', 'assistant'],
  team_leader: ['team_leader', 'salesperson', 'assistant'],
  salesperson: ['assistant'],
  assistant: [],
};

export const canInviteRole = (inviterRole: AppRole, targetRole: AppRole): boolean => {
  return INVITATION_HIERARCHY[inviterRole]?.includes(targetRole) || false;
};

export const canChangeRole = (adminRole: AppRole, currentRole: AppRole, newRole: AppRole): boolean => {
  const canManageCurrent = ROLE_CHANGE_HIERARCHY[adminRole]?.includes(currentRole);
  const canManageNew = ROLE_CHANGE_HIERARCHY[adminRole]?.includes(newRole);
  return canManageCurrent && canManageNew;
};

export const getInvitableRoles = (userRole: AppRole): AppRole[] => {
  return INVITATION_HIERARCHY[userRole] || [];
};

export const getRoleHierarchyLevel = (role: AppRole): number => {
  const levels: Record<AppRole, number> = {
    platform_admin: 1,
    office_manager: 2,
    team_leader: 3,
    salesperson: 4,
    assistant: 5,
  };
  return levels[role] || 999;
};

export const getRoleBadgeColor = (role: AppRole): string => {
  const colors: Record<AppRole, string> = {
    platform_admin: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200',
    office_manager: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200',
    team_leader: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200',
    salesperson: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200',
    assistant: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200',
  };
  return colors[role];
};

export const getRoleDisplayName = (role: AppRole): string => {
  const names: Record<AppRole, string> = {
    platform_admin: 'Platform Admin',
    office_manager: 'Office Manager',
    team_leader: 'Team Leader',
    salesperson: 'Salesperson',
    assistant: 'Assistant',
  };
  return names[role];
};

export const getRoleIcon = (role: AppRole): string => {
  const icons: Record<AppRole, string> = {
    platform_admin: '👑',
    office_manager: '🏢',
    team_leader: '👥',
    salesperson: '💼',
    assistant: '🤝',
  };
  return icons[role];
};

export const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    platform_admin: 'destructive',
    office_manager: 'default',
    team_leader: 'secondary',
    salesperson: 'outline',
    assistant: 'outline',
  };
  return variants[role] || 'outline';
};

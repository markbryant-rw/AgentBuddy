import type { AppRole } from './rbac';

export interface DataScope {
  type: 'global' | 'office' | 'team' | 'user';
  officeId?: string;
  teamId?: string;
  userId?: string;
}

/**
 * Get the data scope for a user based on their active role
 */
export const getScopeForRole = (
  activeRole: AppRole | null,
  activeOfficeId: string | null,
  primaryTeamId: string | null,
  userId: string
): DataScope => {
  if (activeRole === 'platform_admin') {
    return { type: 'global' };
  }

  if (activeRole === 'office_manager') {
    return {
      type: 'office',
      officeId: activeOfficeId || undefined,
    };
  }

  if (activeRole === 'team_leader') {
    return {
      type: 'team',
      teamId: primaryTeamId || undefined,
      officeId: activeOfficeId || undefined,
    };
  }

  // Salesperson and assistant see only their own data
  return {
    type: 'user',
    userId,
  };
};

/**
 * Apply data scope filters to a Supabase query
 */
export const applyScopeFilter = <T>(
  query: any,
  scope: DataScope,
  tableMapping: {
    officeColumn?: string;
    teamColumn?: string;
    userColumn?: string;
  }
) => {
  if (scope.type === 'global') {
    return query; // No filters for global scope
  }

  if (scope.type === 'office' && scope.officeId && tableMapping.officeColumn) {
    return query.eq(tableMapping.officeColumn, scope.officeId);
  }

  if (scope.type === 'team' && scope.teamId && tableMapping.teamColumn) {
    return query.eq(tableMapping.teamColumn, scope.teamId);
  }

  if (scope.type === 'user' && scope.userId && tableMapping.userColumn) {
    return query.eq(tableMapping.userColumn, scope.userId);
  }

  return query;
};

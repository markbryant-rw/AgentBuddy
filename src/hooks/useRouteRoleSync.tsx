import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/lib/rbac';

// Map routes to their corresponding roles
// Note: /team-leader removed - team leaders now use salesperson workspace
const ROUTE_ROLE_MAP: Record<string, AppRole> = {
  '/platform-admin': 'platform_admin',
  '/office-manager': 'office_manager',
  '/dashboard': 'salesperson',
  '/plan-dashboard': 'salesperson',
  '/prospect-dashboard': 'salesperson',
  '/transact-dashboard': 'salesperson',
  '/past-sales-history': 'salesperson',
  '/operate-dashboard': 'salesperson',
  '/grow-dashboard': 'salesperson',
  '/community': 'salesperson',
};

export const useRouteRoleSync = () => {
  const location = useLocation();
  const { user, activeRole, roles, isViewingAs } = useAuth();
  const queryClient = useQueryClient();

  const updateActiveRoleMutation = useMutation({
    mutationFn: async (role: AppRole) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          active_role: role,
          last_role_switch_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-role'] });
    },
  });

  useEffect(() => {
    // CRITICAL: Do not sync roles during "View As" impersonation
    // This would corrupt the impersonated user's active_role in the database
    if (isViewingAs) return;
    
    // Only sync if user is authenticated and has roles
    if (!user || !roles || roles.length === 0) return;

    // Find the role by checking if pathname starts with any route prefix
    // Sort by path length descending to check longer paths first (e.g., /plan-dashboard before /dashboard)
    const sortedRoutes = Object.entries(ROUTE_ROLE_MAP)
      .sort(([a], [b]) => b.length - a.length);

    const matchedEntry = sortedRoutes.find(([route]) => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );

    const matchedRole = matchedEntry?.[1];

    // If we found a matching role and it's different from the current active role
    // and the user actually has this role, update it
    if (matchedRole && matchedRole !== activeRole && roles.includes(matchedRole)) {
      updateActiveRoleMutation.mutate(matchedRole);
    }
  }, [location.pathname, activeRole, user, roles, isViewingAs]);
};

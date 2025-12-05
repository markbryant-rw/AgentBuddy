import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole } from '@/lib/rbac';
import { useAuth } from './useAuth';
import { getRoleDisplayName } from '@/lib/rbac';
import { useNavigate } from 'react-router-dom';
import { getRoleBasedRedirect } from '@/lib/roleRedirect';

export const useRoleSwitcher = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setActiveRoleState } = useAuth();

  // Fetch user's available roles
  const { data: availableRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('revoked_at', null);
      
      if (error) throw error;
      return data.map(r => r.role as AppRole);
    },
    enabled: !!user?.id,
  });

  // Fetch current active role
  const { data: activeRole, isLoading: activeRoleLoading } = useQuery({
    queryKey: ['active-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('active_role')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // Return the active role (or null if not set)
      // Default will be handled elsewhere, not during query fetch
      return data.active_role as AppRole | null;
    },
    enabled: !!user?.id,
  });

  // Switch role mutation
  const switchRoleMutation = useMutation({
    mutationFn: async (role: AppRole) => {
      console.log('[RoleSwitcher] Invoking switch-role function with role:', role);
      const { data, error } = await supabase.functions.invoke('switch-role', {
        body: { role },
      });
      
      console.log('[RoleSwitcher] Response:', { data, error });
      
      if (error) {
        console.error('[RoleSwitcher] Error from edge function:', error);
        throw error;
      }
      return { ...data, role };
    },
    onSuccess: async (result) => {
      console.log('[RoleSwitcher] Success! Result:', result);
      const role = result.role;
      
      // CRITICAL: Update both React Query cache AND AuthContext state
      // This ensures useAuth().activeRole is immediately correct
      queryClient.setQueryData(['active-role', user?.id], role);
      setActiveRoleState(role);
      
      // Then invalidate to refetch fresh data in background
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      toast.success(`Switched to ${getRoleDisplayName(role)} mode`);
      
      // Navigate to the appropriate dashboard for the new role
      const redirectPath = getRoleBasedRedirect(role, availableRoles);
      console.log('[RoleSwitcher] Navigating to:', redirectPath);
      navigate(redirectPath, { replace: true });
    },
    onError: (error: Error) => {
      console.error('[RoleSwitcher] Mutation error:', error);
      toast.error(error.message || 'Failed to switch role');
    },
  });

  return {
    activeRole,
    availableRoles,
    isLoading: rolesLoading || activeRoleLoading,
    switchRole: switchRoleMutation.mutate,
    isSwitching: switchRoleMutation.isPending,
    canSwitchTo: (role: AppRole) => availableRoles?.includes(role) ?? false,
  };
};

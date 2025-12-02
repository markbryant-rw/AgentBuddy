import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'platform_admin' | 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';

export const useUserRoles = () => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('revoked_at', null);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user,
  });

  const hasRole = (role: AppRole) => roles.includes(role);
  
  const hasAnyRole = (checkRoles: AppRole[]) => 
    checkRoles.some(role => roles.includes(role));

  return {
    roles,
    isLoading,
    hasRole,
    hasAnyRole,
    isPlatformAdmin: hasRole('platform_admin'),
    isOfficeManager: hasRole('office_manager'),
    isTeamLeader: hasRole('team_leader'),
  };
};
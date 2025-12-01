import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNewModuleAccess = () => {
  const { user, isPlatformAdmin } = useAuth();

  const { data: effectiveAccess = [], isLoading } = useQuery({
    queryKey: ['user-effective-access', user?.id],
    queryFn: async () => {
      // Platform admins bypass all policies
      if (isPlatformAdmin) {
        const { data: modules } = await supabase
          .from('modules')
          .select('id');
        
        return (modules || []).map(m => ({
          user_id: user!.id,
          module_id: m.id,
          effective_policy: 'enabled',
          policy_source: 'platform_admin',
          reason: 'Platform Admin - Full Access',
          expires_at: null,
        }));
      }

      const { data, error } = await supabase
        .from('user_effective_access_new')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasAccess = (moduleId: string): boolean => {
    const access = effectiveAccess.find(a => a.module_id === moduleId);
    return access?.effective_policy === 'enabled' || access?.effective_policy === 'trial';
  };

  const getAccessInfo = (moduleId: string) => {
    return effectiveAccess.find(a => a.module_id === moduleId);
  };

  const isLocked = (moduleId: string): boolean => {
    const access = effectiveAccess.find(a => a.module_id === moduleId);
    return access?.effective_policy === 'locked' || access?.effective_policy === 'premium_required';
  };

  const isHidden = (moduleId: string): boolean => {
    const access = effectiveAccess.find(a => a.module_id === moduleId);
    return access?.effective_policy === 'hidden';
  };

  return {
    effectiveAccess,
    hasAccess,
    getAccessInfo,
    isLocked,
    isHidden,
    isLoading,
  };
};
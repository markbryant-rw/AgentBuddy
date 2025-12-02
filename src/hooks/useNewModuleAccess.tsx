import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNewModuleAccess = () => {
  const { user, isPlatformAdmin } = useAuth();

  const { data: effectiveAccess = [], isLoading } = useQuery({
    queryKey: ['user-effective-access', user?.id],
    queryFn: async () => {
      // Stub: user_effective_access_new view doesn't exist
      console.log('useNewModuleAccess: Stubbed - returning empty array');
      return [];
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
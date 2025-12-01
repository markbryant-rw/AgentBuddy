import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ModuleId = 
  | 'kpi-tracking'
  | 'listing-pipeline'
  | 'review-roadmap'
  | 'nurture-calculator'
  | 'role-playing'
  | 'vendor-reporting'
  | 'coaches-corner'
  | 'transaction-management'
  | 'feature-request'
  | 'listing-description'
  | 'referrals'
  | 'compliance'
  | 'past-sales-history'
  | 'cma-generator'
  | 'messages'
  | 'task-manager'
  | 'knowledge-base'
  | 'notes'
  | 'people'
  | 'team-meetings'
  | 'service-directory';

interface ModuleAccess {
  hasAccess: boolean;
  accessSource: 'agency' | 'individual' | 'discount_code' | null;
  loading: boolean;
}

export const useModuleAccess = (moduleId: ModuleId): ModuleAccess => {
  const { user } = useAuth();
  const [access, setAccess] = useState<ModuleAccess>({
    hasAccess: false,
    accessSource: null,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setAccess({ hasAccess: false, accessSource: null, loading: false });
      return;
    }

    const checkAccess = async () => {
      const { data, error } = await supabase
        .from('user_module_access' as any)
        .select('module_id, access_source')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (error) {
        console.error('Error checking module access:', error);
        setAccess({ hasAccess: false, accessSource: null, loading: false });
        return;
      }

      // Type guard for access_source validation
      const validateAccessSource = (value: unknown): 'agency' | 'individual' | 'discount_code' | null => {
        if (!value) return null;
        if (value === 'agency' || value === 'individual' || value === 'discount_code') {
          return value;
        }
        console.warn('Unexpected access_source value:', value);
        return null;
      };

      // Safe type checking
      if (data !== null && typeof data === 'object') {
        const dataObj = data as Record<string, any>;
        const hasRequiredFields = 'module_id' in dataObj && 'access_source' in dataObj;
        if (hasRequiredFields) {
          setAccess({
            hasAccess: true,
            accessSource: validateAccessSource(dataObj.access_source),
            loading: false
          });
          return;
        }
      }
      
      setAccess({
        hasAccess: false,
        accessSource: null,
        loading: false
      });
    };

    checkAccess();

    // Subscribe to changes in user_module_access view for real-time updates
    const subscription = supabase
      .channel('module_access_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_module_access',
        filter: `user_id=eq.${user.id}`
      }, checkAccess)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, moduleId]);

  return access;
};

export const useAllModuleAccess = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<Record<ModuleId, ModuleAccess>>({
    'kpi-tracking': { hasAccess: false, accessSource: null, loading: true },
    'listing-pipeline': { hasAccess: false, accessSource: null, loading: true },
    'review-roadmap': { hasAccess: false, accessSource: null, loading: true },
    'nurture-calculator': { hasAccess: false, accessSource: null, loading: true },
    'role-playing': { hasAccess: false, accessSource: null, loading: true },
    'vendor-reporting': { hasAccess: false, accessSource: null, loading: true },
    'coaches-corner': { hasAccess: false, accessSource: null, loading: true },
    'transaction-management': { hasAccess: false, accessSource: null, loading: true },
    'feature-request': { hasAccess: false, accessSource: null, loading: true },
    'listing-description': { hasAccess: false, accessSource: null, loading: true },
    'referrals': { hasAccess: false, accessSource: null, loading: true },
    'compliance': { hasAccess: false, accessSource: null, loading: true },
    'past-sales-history': { hasAccess: false, accessSource: null, loading: true },
    'cma-generator': { hasAccess: false, accessSource: null, loading: true },
    'messages': { hasAccess: false, accessSource: null, loading: true },
    'task-manager': { hasAccess: false, accessSource: null, loading: true },
    'knowledge-base': { hasAccess: false, accessSource: null, loading: true },
    'notes': { hasAccess: false, accessSource: null, loading: true },
    'people': { hasAccess: false, accessSource: null, loading: true },
    'team-meetings': { hasAccess: false, accessSource: null, loading: true },
    'service-directory': { hasAccess: false, accessSource: null, loading: true },
  });

  useEffect(() => {
    if (!user) {
      setModules({
        'kpi-tracking': { hasAccess: false, accessSource: null, loading: false },
        'listing-pipeline': { hasAccess: false, accessSource: null, loading: false },
        'review-roadmap': { hasAccess: false, accessSource: null, loading: false },
        'nurture-calculator': { hasAccess: false, accessSource: null, loading: false },
        'role-playing': { hasAccess: false, accessSource: null, loading: false },
        'vendor-reporting': { hasAccess: false, accessSource: null, loading: false },
        'coaches-corner': { hasAccess: false, accessSource: null, loading: false },
        'transaction-management': { hasAccess: false, accessSource: null, loading: false },
        'feature-request': { hasAccess: false, accessSource: null, loading: false },
        'listing-description': { hasAccess: false, accessSource: null, loading: false },
        'referrals': { hasAccess: false, accessSource: null, loading: false },
        'compliance': { hasAccess: false, accessSource: null, loading: false },
        'past-sales-history': { hasAccess: false, accessSource: null, loading: false },
        'cma-generator': { hasAccess: false, accessSource: null, loading: false },
        'messages': { hasAccess: false, accessSource: null, loading: false },
        'task-manager': { hasAccess: false, accessSource: null, loading: false },
        'knowledge-base': { hasAccess: false, accessSource: null, loading: false },
        'notes': { hasAccess: false, accessSource: null, loading: false },
        'people': { hasAccess: false, accessSource: null, loading: false },
        'team-meetings': { hasAccess: false, accessSource: null, loading: false },
        'service-directory': { hasAccess: false, accessSource: null, loading: false },
      });
      return;
    }

    const checkAllAccess = async () => {
      const { data, error } = await supabase
        .from('user_module_access' as any)
        .select('module_id, access_source')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking all module access:', error);
        return;
      }

      const accessMap: Record<ModuleId, ModuleAccess> = {
        'kpi-tracking': { hasAccess: false, accessSource: null, loading: false },
        'listing-pipeline': { hasAccess: false, accessSource: null, loading: false },
        'review-roadmap': { hasAccess: false, accessSource: null, loading: false },
        'nurture-calculator': { hasAccess: false, accessSource: null, loading: false },
        'role-playing': { hasAccess: false, accessSource: null, loading: false },
        'vendor-reporting': { hasAccess: false, accessSource: null, loading: false },
        'coaches-corner': { hasAccess: false, accessSource: null, loading: false },
        'transaction-management': { hasAccess: false, accessSource: null, loading: false },
        'feature-request': { hasAccess: false, accessSource: null, loading: false },
        'listing-description': { hasAccess: false, accessSource: null, loading: false },
        'referrals': { hasAccess: false, accessSource: null, loading: false },
        'compliance': { hasAccess: false, accessSource: null, loading: false },
        'past-sales-history': { hasAccess: false, accessSource: null, loading: false },
        'cma-generator': { hasAccess: false, accessSource: null, loading: false },
        'messages': { hasAccess: false, accessSource: null, loading: false },
        'task-manager': { hasAccess: false, accessSource: null, loading: false },
        'knowledge-base': { hasAccess: false, accessSource: null, loading: false },
        'notes': { hasAccess: false, accessSource: null, loading: false },
        'people': { hasAccess: false, accessSource: null, loading: false },
        'team-meetings': { hasAccess: false, accessSource: null, loading: false },
        'service-directory': { hasAccess: false, accessSource: null, loading: false },
      };

      data?.forEach((item: any) => {
        if (item.module_id in accessMap) {
          accessMap[item.module_id as ModuleId] = {
            hasAccess: true,
            accessSource: item.access_source,
            loading: false
          };
        }
      });

      setModules(accessMap);
    };

    checkAllAccess();
  }, [user]);

  return modules;
};

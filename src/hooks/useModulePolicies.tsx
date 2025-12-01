import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Module {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon: string | null;
  dependencies: string[];
  default_policy: string;
  is_system: boolean;
  sort_order: number;
}

export interface ModulePolicy {
  id: string;
  module_id: string;
  scope_type: 'global' | 'office' | 'team' | 'user';
  scope_id: string | null;
  policy: 'enabled' | 'locked' | 'hidden' | 'trial' | 'premium_required';
  reason: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EffectiveAccess {
  user_id: string;
  module_id: string;
  effective_policy: string;
  policy_source: string;
  reason: string;
  expires_at: string | null;
}

export const useModulePolicies = () => {
  const queryClient = useQueryClient();

  // Fetch all modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, title, description, category, icon, dependencies, default_policy, is_system, sort_order')
        .order('sort_order');

      if (error) throw error;
      return data as Module[];
    },
  });

  // Fetch policies by scope
  const usePolicies = (scopeType?: string, scopeId?: string) => {
    return useQuery({
      queryKey: ['module-policies', scopeType, scopeId],
      queryFn: async () => {
        let query = supabase.from('module_policies').select('id, module_id, scope_type, scope_id, policy, reason, expires_at, created_by, created_at, updated_at');

        if (scopeType) {
          query = query.eq('scope_type', scopeType);
        }
        if (scopeId) {
          query = query.eq('scope_id', scopeId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ModulePolicy[];
      },
    });
  };

  // Fetch effective access for a user
  const useEffectiveAccess = (userId?: string) => {
    return useQuery({
      queryKey: ['effective-access', userId],
      queryFn: async () => {
        let query = supabase.from('user_effective_access_new').select('user_id, module_id, effective_policy, policy_source, reason, expires_at');

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as EffectiveAccess[];
      },
      enabled: !!userId,
    });
  };

  // Create or update policy
  const upsertPolicy = useMutation({
    mutationFn: async (policy: Omit<ModulePolicy, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('module_policies')
        .upsert({
          ...policy,
          created_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('module_audit_events').insert({
        admin_id: user.user?.id,
        event_type: 'policy_updated',
        module_id: policy.module_id,
        scope_type: policy.scope_type,
        scope_id: policy.scope_id,
        new_policy: policy.policy,
        reason: policy.reason,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-policies'] });
      queryClient.invalidateQueries({ queryKey: ['effective-access'] });
      toast.success('Policy updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update policy');
    },
  });

  // Delete policy
  const deletePolicy = useMutation({
    mutationFn: async ({ id, moduleId }: { id: string; moduleId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('module_policies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      await supabase.from('module_audit_events').insert({
        admin_id: user.user?.id,
        event_type: 'policy_deleted',
        module_id: moduleId,
        reason: 'Policy removed by admin',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-policies'] });
      queryClient.invalidateQueries({ queryKey: ['effective-access'] });
      toast.success('Policy removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove policy');
    },
  });

  // Bulk update policies
  const bulkUpsertPolicies = useMutation({
    mutationFn: async (policies: Array<Omit<ModulePolicy, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const policiesWithMeta = policies.map(p => ({
        ...p,
        created_by: user.user?.id,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('module_policies')
        .upsert(policiesWithMeta)
        .select();

      if (error) throw error;

      // Log bulk audit event
      await supabase.from('module_audit_events').insert({
        admin_id: user.user?.id,
        event_type: 'bulk_policy_update',
        metadata: { affected_modules: policies.length },
        reason: 'Bulk policy update',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-policies'] });
      queryClient.invalidateQueries({ queryKey: ['effective-access'] });
      toast.success('Policies updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update policies');
    },
  });

  // Update module metadata
  const updateModule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Module> }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Check if trying to edit system module
      const module = modules.find(m => m.id === id);
      if (module?.is_system) {
        throw new Error('System modules cannot be edited');
      }

      const { data, error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('module_audit_events').insert({
        admin_id: user.user?.id,
        event_type: 'module_updated',
        module_id: id,
        metadata: { changes: updates },
        reason: 'Module metadata updated',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Module updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update module');
    },
  });

  return {
    modules,
    modulesLoading,
    usePolicies,
    useEffectiveAccess,
    upsertPolicy,
    deletePolicy,
    bulkUpsertPolicies,
    updateModule,
  };
};
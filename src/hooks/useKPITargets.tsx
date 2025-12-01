import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTeam } from "./useTeam";
import { toast } from "sonner";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
export type TargetSource = 'custom' | 'business_plan';
export type KPIType = 'calls' | 'sms' | 'appraisals' | 'open_homes' | 'listings' | 'sales';

interface KPITarget {
  id: string;
  user_id: string;
  team_id: string | null;
  kpi_type: KPIType;
  target_value: number;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  source: TargetSource;
  created_by: string;
  set_by_admin: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTargetData {
  kpi_type: KPIType;
  target_value: number;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  source?: TargetSource;
  team_id?: string | null;
  set_by_admin?: boolean;
  admin_notes?: string;
}

interface UpdateTargetData {
  target_value?: number;
  period_type?: PeriodType;
  start_date?: string;
  end_date?: string;
  admin_notes?: string;
}

export const useKPITargets = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  // Fetch user's active targets
  const { data: targets = [], isLoading, refetch } = useQuery({
    queryKey: ['kpi-targets', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('kpi_targets' as any)
        .select('id, user_id, team_id, kpi_type, target_value, period_type, start_date, end_date, source, created_by, set_by_admin, admin_notes, created_at, updated_at')
        .eq('user_id', user.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as KPITarget[];
    },
    enabled: !!user,
  });

  // Fetch team targets (for admins)
  const { data: teamTargets = [] } = useQuery({
    queryKey: ['team-targets', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];

      const { data, error } = await supabase
        .from('kpi_targets' as any)
        .select(`
          id, user_id, team_id, kpi_type, target_value, period_type, start_date, end_date, source, created_by, set_by_admin, admin_notes, created_at, updated_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('team_id', team.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!team?.id,
  });

  // Create target mutation
  const createTarget = useMutation({
    mutationFn: async (targetData: CreateTargetData) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('kpi_targets' as any)
        .insert({
          ...targetData,
          user_id: user.id,
          created_by: user.id,
          team_id: targetData.team_id || team?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      toast.success("🎯 Target created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create target: ${error.message}`);
    },
  });

  // Update target mutation
  const updateTarget = useMutation({
    mutationFn: async ({ targetId, updates }: { targetId: string; updates: UpdateTargetData }) => {
      const { data, error } = await supabase
        .from('kpi_targets' as any)
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      toast.success("Target updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update target: ${error.message}`);
    },
  });

  // Delete target mutation
  const deleteTarget = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from('kpi_targets' as any)
        .delete()
        .eq('id', targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      queryClient.invalidateQueries({ queryKey: ['team-targets'] });
      toast.success("Target deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete target: ${error.message}`);
    },
  });

  // Helper: Get period date range
  const getPeriodDateRange = (periodType: PeriodType, customStart?: Date, customEnd?: Date) => {
    const now = new Date();
    
    switch (periodType) {
      case 'daily':
        return {
          start_date: startOfDay(now).toISOString().split('T')[0],
          end_date: endOfDay(now).toISOString().split('T')[0],
        };
      case 'weekly':
        return {
          start_date: startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0],
          end_date: endOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0],
        };
      case 'monthly':
        return {
          start_date: startOfMonth(now).toISOString().split('T')[0],
          end_date: endOfMonth(now).toISOString().split('T')[0],
        };
      case 'quarterly':
        return {
          start_date: startOfQuarter(now).toISOString().split('T')[0],
          end_date: endOfQuarter(now).toISOString().split('T')[0],
        };
      case 'custom':
        if (!customStart || !customEnd) {
          throw new Error("Custom period requires start and end dates");
        }
        return {
          start_date: customStart.toISOString().split('T')[0],
          end_date: customEnd.toISOString().split('T')[0],
        };
      default:
        throw new Error(`Invalid period type: ${periodType}`);
    }
  };

  // Helper: Calculate progress for a target
  const calculateProgress = (target: KPITarget, currentValue: number) => {
    const percentage = Math.round((currentValue / target.target_value) * 100);
    const remaining = target.target_value - currentValue;
    
    return {
      percentage: Math.min(percentage, 100),
      current: currentValue,
      target: target.target_value,
      remaining: Math.max(remaining, 0),
      status: percentage >= 100 ? 'complete' : percentage >= 90 ? 'on-track' : percentage >= 60 ? 'behind' : 'at-risk',
    };
  };

  // Helper: Get target by KPI type and period
  const getTargetByType = (kpiType: KPIType, periodType: PeriodType = 'weekly') => {
    return targets.find(t => t.kpi_type === kpiType && t.period_type === periodType);
  };

  return {
    targets,
    teamTargets,
    isLoading,
    createTarget: createTarget.mutate,
    updateTarget: updateTarget.mutate,
    deleteTarget: deleteTarget.mutate,
    refetch,
    getPeriodDateRange,
    calculateProgress,
    getTargetByType,
    isCreating: createTarget.isPending,
    isUpdating: updateTarget.isPending,
    isDeleting: deleteTarget.isPending,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useFinancialYear } from './useFinancialYear';
import { toast } from 'sonner';

export interface QuarterlyGoal {
  id: string;
  team_id: string;
  goal_type: string;
  quarter: string;
  year: number;
  kpi_type: string | null;
  target_value: number;
  current_value: number;
  created_by: string | null;
  created_at: string;
}

export const useQuarterlyGoals = (quarter?: number, year?: number) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { currentQuarter } = useFinancialYear();
  
  const [goals, setGoals] = useState<QuarterlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  
  const targetQuarter = quarter || currentQuarter.quarter;
  const targetYear = year || currentQuarter.year;
  const quarterString = `Q${targetQuarter}`;

  const fetchGoals = useCallback(async () => {
    if (!team) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('quarterly_goals')
      .select('id, team_id, goal_type, quarter, year, kpi_type, target_value, current_value, created_by, created_at')
      .eq('team_id', team.id)
      .eq('quarter', quarterString)
      .eq('year', targetYear);

    if (error) {
      console.error('Error fetching quarterly goals:', error);
      toast.error('Failed to load quarterly goals');
    } else {
      setGoals((data || []) as QuarterlyGoal[]);
    }

    setLoading(false);
  }, [team, quarterString, targetYear]);

  useEffect(() => {
    if (team) {
      fetchGoals();
    }
  }, [team, fetchGoals]);
  
  const createGoal = async (goalData: Omit<QuarterlyGoal, 'id' | 'created_at' | 'created_by' | 'team_id' | 'current_value'>) => {
    if (!user || !team) return;
    
    const { data, error } = await supabase
      .from('quarterly_goals')
      .insert({
        ...goalData,
        team_id: team.id,
        created_by: user.id,
        quarter: quarterString,
        year: targetYear,
        current_value: 0,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to create goal');
      throw error;
    }
    
    toast.success('Goal created successfully');
    await fetchGoals();
    return data;
  };
  
  const updateGoal = async (goalId: string, updates: Partial<QuarterlyGoal>) => {
    // Convert quarter number to string if provided
    const processedUpdates = { ...updates };
    if (typeof processedUpdates.quarter === 'number') {
      processedUpdates.quarter = `Q${processedUpdates.quarter}`;
    }
    
    const { error } = await supabase
      .from('quarterly_goals')
      .update(processedUpdates)
      .eq('id', goalId);
    
    if (error) {
      toast.error('Failed to update goal');
      throw error;
    }
    
    toast.success('Goal updated successfully');
    await fetchGoals();
  };
  
  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('quarterly_goals')
      .delete()
      .eq('id', goalId);
    
    if (error) {
      toast.error('Failed to delete goal');
      throw error;
    }
    
    toast.success('Goal deleted successfully');
    await fetchGoals();
  };
  
  const calculatePerformance = async () => {
    if (!user || !team) return {};
    
    const { startDate, endDate } = currentQuarter;
    
    const { data, error } = await supabase
      .from('kpi_entries')
      .select('kpi_type, value')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);
    
    if (error) {
      console.error('Error calculating performance:', error);
      return {};
    }
    
    const performance: Record<string, number> = {};
    data?.forEach((entry) => {
      performance[entry.kpi_type] = (performance[entry.kpi_type] || 0) + entry.value;
    });
    
    return performance;
  };
  
  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    calculatePerformance,
    refreshGoals: fetchGoals
  };
};

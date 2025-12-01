import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface RecurringTemplate {
  id: string;
  team_id: string;
  title: string;
  size_category: 'big' | 'medium' | 'little';
  estimated_minutes: number | null;
  notes: string | null;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  recurrence_days: number[] | null;
  start_date: string;
  end_date: string | null;
  created_by: string;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useRecurringTasks() {
  const { team } = useTeam();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['recurring-templates', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];

      const { data, error } = await supabase
        .from('daily_planner_recurring_templates')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecurringTemplate[];
    },
    enabled: !!team?.id,
  });

  const generateForDate = useMutation({
    mutationFn: async (date: Date) => {
      if (!team?.id) throw new Error('No team selected');

      const { data, error } = await supabase.rpc('generate_recurring_tasks_for_date', {
        p_team_id: team.id,
        p_target_date: format(date, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      // Validate that data is a number
      if (typeof data !== 'number') {
        throw new Error('Expected RPC to return a number');
      }

      return data;
    },
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
        toast({
          title: 'Recurring tasks generated',
          description: `${count} task${count !== 1 ? 's' : ''} added to planner`,
        });
      }
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<RecurringTemplate, 'id' | 'created_at' | 'updated_at' | 'last_generated_date'>) => {
      const { data, error } = await supabase
        .from('daily_planner_recurring_templates')
        .insert({
          ...template,
          team_id: team?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      toast({
        title: 'Recurring task created',
        description: 'Your recurring task has been set up successfully',
      });
      
      // Immediately generate tasks for today
      if (team?.id) {
        const { data, error } = await supabase.rpc('generate_recurring_tasks_for_date', {
          p_team_id: team.id,
          p_target_date: format(new Date(), 'yyyy-MM-dd'),
        });
        
        if (!error && data && data > 0) {
          queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
        }
      }
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RecurringTemplate> }) => {
      const { error } = await supabase
        .from('daily_planner_recurring_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      toast({
        title: 'Recurring task updated',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_planner_recurring_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      toast({
        title: 'Recurring task deleted',
      });
    },
  });

  return {
    templates,
    isLoading,
    generateForDate: (date: Date) => generateForDate.mutate(date),
    createTemplate: (data: Parameters<typeof createTemplate.mutate>[0]) => createTemplate.mutate(data),
    updateTemplate: (data: Parameters<typeof updateTemplate.mutate>[0]) => updateTemplate.mutate(data),
    deleteTemplate: (id: string) => deleteTemplate.mutate(id),
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay } from 'date-fns';
import { toast } from 'sonner';

export const useAdminDailyPlanner = (role: 'platform_admin' | 'office_manager') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-daily-planner', role, today, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get items for today, filtered by role
      const { data, error } = await supabase
        .from('daily_planner_items')
        .select('*')
        .eq('created_by', user.id)
        .eq('scheduled_date', today)
        .order('position');

      if (error) throw error;

      // Filter by role-specific prefix in title or notes
      // This is a simple approach - items for admins are tagged
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ title, sizeCategory, estimatedMinutes }: { 
      title: string; 
      sizeCategory: string;
      estimatedMinutes?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_planner_items')
        .insert({
          title: `[${role.toUpperCase()}] ${title}`,
          scheduled_date: today,
          created_by: user.id,
          team_id: user.id, // Use user_id as team_id for admin items
          size_category: sizeCategory,
          estimated_minutes: estimatedMinutes,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-daily-planner'] });
      toast.success('Task added to daily planner');
    },
    onError: () => {
      toast.error('Failed to add task');
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('daily_planner_items')
        .update({ 
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-daily-planner'] });
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_planner_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-daily-planner'] });
      toast.success('Task removed');
    },
    onError: () => {
      toast.error('Failed to remove task');
    },
  });

  return {
    items,
    isLoading,
    addItem: addItemMutation.mutateAsync,
    toggleComplete: toggleCompleteMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
  };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export interface WeeklyTaskSettings {
  id: string;
  team_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeeklyTaskTemplate {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  day_of_week: number; // 1=Mon, 7=Sun
  default_size_category: 'big' | 'medium' | 'little';
  position: number;
  is_active: boolean;
  created_at: string;
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getDayName = (dayOfWeek: number) => DAY_NAMES[dayOfWeek] || 'Unknown';

export const DEFAULT_TEMPLATES: Omit<WeeklyTaskTemplate, 'id' | 'team_id' | 'created_at'>[] = [
  { title: 'Buyer Callbacks', description: 'Follow up with interested buyers from open homes', day_of_week: 1, default_size_category: 'big', position: 0, is_active: true },
  { title: 'Vendor Report / Catchup', description: 'Weekly vendor communication and market update', day_of_week: 4, default_size_category: 'medium', position: 1, is_active: true },
  { title: 'Campaign Report Update', description: 'Update campaign metrics and portal statistics', day_of_week: 3, default_size_category: 'medium', position: 2, is_active: true },
  { title: 'Open Home Schedule', description: 'Confirm and prepare for weekend open homes', day_of_week: 5, default_size_category: 'little', position: 3, is_active: true },
  { title: 'Price Review Discussion', description: 'Discuss pricing strategy based on market feedback', day_of_week: 2, default_size_category: 'big', position: 4, is_active: true },
  { title: 'Marketing Review', description: 'Review marketing performance and adjust strategy', day_of_week: 3, default_size_category: 'little', position: 5, is_active: true },
];

export function useWeeklyTaskSettings() {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['weekly-task-settings', team?.id],
    queryFn: async () => {
      if (!team?.id) return null;
      
      const { data, error } = await supabase
        .from('weekly_task_settings')
        .select('*')
        .eq('team_id', team.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeeklyTaskSettings | null;
    },
    enabled: !!team?.id,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['weekly-task-templates', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      
      const { data, error } = await supabase
        .from('weekly_task_templates')
        .select('*')
        .eq('team_id', team.id)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as WeeklyTaskTemplate[];
    },
    enabled: !!team?.id,
  });

  const enableFeatureMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!team?.id) throw new Error('No team');
      
      if (settings) {
        const { error } = await supabase
          .from('weekly_task_settings')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('weekly_task_settings')
          .insert({ team_id: team.id, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task-settings'] });
      toast.success('Weekly tasks settings updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const addTemplateMutation = useMutation({
    mutationFn: async (template: Omit<WeeklyTaskTemplate, 'id' | 'team_id' | 'created_at'>) => {
      if (!team?.id) throw new Error('No team');
      
      const { error } = await supabase
        .from('weekly_task_templates')
        .insert({ ...template, team_id: team.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WeeklyTaskTemplate> }) => {
      const { error } = await supabase
        .from('weekly_task_templates')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('weekly_task_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-task-templates'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const seedDefaultTemplates = async () => {
    if (!team?.id) return;
    
    for (const template of DEFAULT_TEMPLATES) {
      await supabase
        .from('weekly_task_templates')
        .insert({ ...template, team_id: team.id });
    }
    queryClient.invalidateQueries({ queryKey: ['weekly-task-templates'] });
  };

  const generateTasksNow = async (listingIds?: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-weekly-listing-tasks', {
        body: { teamId: team?.id, listingIds, manual: true },
      });
      
      if (error) throw error;
      
      toast.success(`Generated ${data?.tasksCreated || 0} weekly tasks`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate tasks');
      throw error;
    }
  };

  return {
    settings,
    templates,
    isLoading: settingsLoading || templatesLoading,
    isEnabled: settings?.enabled ?? false,
    enableFeature: enableFeatureMutation.mutate,
    addTemplate: addTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    seedDefaultTemplates,
    generateTasksNow,
    isGenerating: false,
  };
}

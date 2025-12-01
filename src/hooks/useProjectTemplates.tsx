import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  tasks: Array<{
    title: string;
    priority: string;
    due_offset_days: number;
    description?: string;
  }>;
  team_id: string | null;
  agency_id?: string | null;
  is_system_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  default_assignee_role?: string | null;
  template_version?: number;
  is_archived?: boolean;
  usage_count?: number;
}

export const useProjectTemplates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('is_archived', false)
        .order('lifecycle_stage');

      if (error) throw error;
      return (data || []).map(template => ({
        ...template,
        tasks: Array.isArray(template.tasks) ? template.tasks : []
      })) as ProjectTemplate[];
    },
    enabled: !!user,
  });

  const getTemplateByStage = (stage: string) => {
    return templates.find(t => t.lifecycle_stage === stage && t.is_system_default);
  };

  const createTemplate = useMutation({
    mutationFn: async (newTemplate: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          ...newTemplate,
          team_id: teamData!.team_id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Template created');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectTemplate> }) => {
      const { data, error } = await supabase
        .from('project_templates')
        .update({
          ...updates,
          template_version: (updates.template_version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Template updated');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_templates')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Template archived');
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          lifecycle_stage: template.lifecycle_stage,
          tasks: template.tasks,
          team_id: teamData!.team_id,
          created_by: user!.id,
          is_system_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Template duplicated');
    },
  });

  return {
    templates,
    isLoading,
    getTemplateByStage,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    duplicateTemplate: duplicateTemplate.mutateAsync,
  };
};

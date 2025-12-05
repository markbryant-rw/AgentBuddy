import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export type AppraisalStage = 'VAP' | 'MAP' | 'LAP';

export interface AppraisalTemplateTask {
  title: string;
  section: string;
  description?: string;
  due_offset_days?: number;
  priority?: string;
  knowledge_base_article_id?: string;
}

export interface AppraisalTemplate {
  id: string;
  name: string;
  description: string | null;
  stage: AppraisalStage;
  tasks: AppraisalTemplateTask[];
  is_default: boolean;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useAppraisalTemplates = () => {
  const queryClient = useQueryClient();
  const { team } = useTeam();
  const teamId = team?.id;

  // Fetch all templates for the team
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['appraisal-templates', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from('appraisal_stage_templates')
        .select('*')
        .eq('team_id', teamId)
        .order('stage', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(t => ({
        ...t,
        tasks: (Array.isArray(t.tasks) ? t.tasks : []) as unknown as AppraisalTemplateTask[],
      })) as AppraisalTemplate[];
    },
    enabled: !!teamId,
  });

  // Get templates for a specific stage
  const getTemplatesForStage = (stage: AppraisalStage) => {
    return templates.filter(t => t.stage === stage);
  };

  // Get default template for a stage
  const getDefaultTemplate = (stage: AppraisalStage) => {
    return templates.find(t => t.stage === stage && t.is_default);
  };

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<AppraisalTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!teamId) throw new Error('No team selected');

      const { data, error } = await supabase
        .from('appraisal_stage_templates')
        .insert({
          name: template.name,
          description: template.description,
          stage: template.stage,
          tasks: template.tasks as any,
          is_default: template.is_default,
          team_id: teamId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-templates', teamId] });
      toast.success('Template created');
    },
    onError: (error) => {
      toast.error('Failed to create template');
      console.error(error);
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AppraisalTemplate> }) => {
      const { data, error } = await supabase
        .from('appraisal_stage_templates')
        .update({
          name: updates.name,
          description: updates.description,
          stage: updates.stage,
          tasks: updates.tasks as any,
          is_default: updates.is_default,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-templates', teamId] });
      toast.success('Template updated');
    },
    onError: (error) => {
      toast.error('Failed to update template');
      console.error(error);
    },
  });

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appraisal_stage_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-templates', teamId] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template');
      console.error(error);
    },
  });

  // Set template as default for its stage
  const setAsDefault = useMutation({
    mutationFn: async ({ templateId, stage }: { templateId: string; stage: AppraisalStage }) => {
      if (!teamId) throw new Error('No team selected');

      // First, unset any existing default for this stage
      await supabase
        .from('appraisal_stage_templates')
        .update({ is_default: false })
        .eq('team_id', teamId)
        .eq('stage', stage);

      // Then set the new default
      const { error } = await supabase
        .from('appraisal_stage_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-templates', teamId] });
      toast.success('Default template updated');
    },
    onError: (error) => {
      toast.error('Failed to set default template');
      console.error(error);
    },
  });

  // Apply template to an appraisal - creates tasks
  const applyTemplate = useMutation({
    mutationFn: async ({ 
      templateId, 
      appraisalId, 
      appraisalDate,
      agentId 
    }: { 
      templateId: string; 
      appraisalId: string; 
      appraisalDate: string;
      agentId?: string;
    }) => {
      // Get the template
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate due dates and create tasks
      const tasksToCreate = template.tasks.map(task => {
        let dueDate: string | null = null;
        if (task.due_offset_days !== undefined) {
          const anchor = new Date(appraisalDate);
          anchor.setDate(anchor.getDate() + task.due_offset_days);
          dueDate = anchor.toISOString().split('T')[0];
        }

        return {
          title: task.title,
          description: task.description || null,
          section: task.section,
          due_date: dueDate,
          priority: task.priority || 'medium',
          appraisal_id: appraisalId,
          appraisal_stage: template.stage,
          assigned_to: agentId || user.id,
          created_by: user.id,
          completed: false,
        };
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-tasks', variables.appraisalId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      toast.success('Tasks created from template');
    },
    onError: (error) => {
      toast.error('Failed to apply template');
      console.error(error);
    },
  });

  return {
    templates,
    isLoading,
    refetch,
    getTemplatesForStage,
    getDefaultTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setAsDefault,
    applyTemplate,
  };
};

// Stage display names
export const APPRAISAL_STAGE_DISPLAY_NAMES: Record<AppraisalStage, string> = {
  VAP: 'VAP (Verbal Appraisal)',
  MAP: 'MAP (Market Appraisal)',
  LAP: 'LAP (Listing Appraisal)',
};

export const APPRAISAL_STAGES: AppraisalStage[] = ['VAP', 'MAP', 'LAP'];

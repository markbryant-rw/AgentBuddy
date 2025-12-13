import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CommunicationTemplate {
  id: string;
  type: 'email' | 'sms' | 'anniversary_email';
  name: string;
  subject_template: string | null;
  body_template: string;
  variables: string[];
  trigger_event: string | null;
  scope: 'platform' | 'office' | 'team' | 'user';
  is_system_template: boolean;
  is_default: boolean;
  agency_id: string | null;
  team_id: string | null;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCommunicationTemplates = (type?: CommunicationTemplate['type']) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['communication-templates', type],
    queryFn: async (): Promise<CommunicationTemplate[]> => {
      let query = supabase
        .from('communication_templates')
        .select('*')
        .order('is_system_template', { ascending: false })
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CommunicationTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<CommunicationTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          ...template,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template created');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CommunicationTemplate> }) => {
      const { data, error } = await supabase
        .from('communication_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communication_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          type: template.type,
          name: `${template.name} (Copy)`,
          subject_template: template.subject_template,
          body_template: template.body_template,
          variables: template.variables,
          trigger_event: template.trigger_event,
          scope: 'team',
          is_system_template: false,
          is_default: false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-templates'] });
      toast.success('Template duplicated');
    },
    onError: () => {
      toast.error('Failed to duplicate template');
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    duplicateTemplate: duplicateTemplate.mutateAsync,
  };
};

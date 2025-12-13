import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NoteTemplate {
  id: string;
  title: string;
  description: string | null;
  content_rich: any;
  category: string;
  scope: 'platform' | 'office' | 'team' | 'user';
  is_system_template: boolean;
  is_default: boolean;
  agency_id: string | null;
  team_id: string | null;
  created_by: string | null;
  usage_count: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useNoteTemplatesReal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['note-templates-real'],
    queryFn: async (): Promise<NoteTemplate[]> => {
      const { data, error } = await supabase
        .from('note_templates')
        .select('*')
        .is('archived_at', null)
        .order('is_system_template', { ascending: false })
        .order('title');

      if (error) throw error;
      return (data || []) as NoteTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<NoteTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count' | 'archived_at'>) => {
      const { data, error } = await supabase
        .from('note_templates')
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
      queryClient.invalidateQueries({ queryKey: ['note-templates-real'] });
      toast.success('Note template created');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NoteTemplate> }) => {
      const { data, error } = await supabase
        .from('note_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates-real'] });
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('note_templates')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates-real'] });
      toast.success('Template archived');
    },
    onError: () => {
      toast.error('Failed to archive template');
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await supabase
        .from('note_templates')
        .insert({
          title: `${template.title} (Copy)`,
          description: template.description,
          content_rich: template.content_rich,
          category: template.category,
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
      queryClient.invalidateQueries({ queryKey: ['note-templates-real'] });
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

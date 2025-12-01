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
  is_system: boolean;
  created_by: string | null;
  team_id: string | null;
  created_at: string;
  usage_count?: number;
  archived_at?: string | null;
}

export const useNoteTemplates = (category?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['note-templates', category],
    queryFn: async () => {
      let query = supabase
        .from('note_templates')
        .select('*')
        .order('title');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NoteTemplate[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      content_rich: any;
      category: string;
      team_id?: string | null;
    }) => {
      const { data: template, error } = await supabase
        .from('note_templates')
        .insert({
          ...data,
          created_by: user!.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates'] });
      toast.success('Template created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      content_rich?: any;
      category?: string;
    }) => {
      const { data: template, error } = await supabase
        .from('note_templates')
        .update(data)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates'] });
      toast.success('Template updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('note_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const archiveTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('note_templates')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-templates'] });
      toast.success('Template archived');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive template');
    },
  });

  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      // Fetch current count and increment
      const { data: template } = await supabase
        .from('note_templates')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (template) {
        const { error } = await supabase
          .from('note_templates')
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq('id', id);

        if (error) throw error;
      }
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    incrementUsage,
  };
};

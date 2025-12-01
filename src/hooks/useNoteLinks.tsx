import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NoteLink {
  id: string;
  note_id: string;
  target_type: 'task' | 'project' | 'listing' | 'message';
  target_id: string;
  created_at: string;
  created_by: string;
}

export const useNoteLinks = (noteId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['note-links', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_links')
        .select('*')
        .eq('note_id', noteId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NoteLink[];
    },
    enabled: !!noteId,
  });

  const createLink = useMutation({
    mutationFn: async (data: {
      note_id: string;
      target_type: 'task' | 'project' | 'listing' | 'message';
      target_id: string;
    }) => {
      const { data: link, error } = await supabase
        .from('note_links')
        .insert({
          ...data,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return link;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-links'] });
      toast.success('Link created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create link');
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('note_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-links'] });
      toast.success('Link removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove link');
    },
  });

  return {
    links,
    isLoading,
    createLink,
    deleteLink,
  };
};

// Hook to get reverse links (what notes link to this entity)
export const useReverseNoteLinks = (targetType: string, targetId: string | undefined) => {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['reverse-note-links', targetType, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_links')
        .select(`
          *,
          notes (
            id,
            title,
            owner_id,
            updated_at,
            profiles:owner_id (
              full_name,
              email
            )
          )
        `)
        .eq('target_type', targetType)
        .eq('target_id', targetId!);

      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });

  return { links, isLoading };
};

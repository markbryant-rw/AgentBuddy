import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface NoteComment {
  id: string;
  note_id: string;
  body: any;
  mentions: string[];
  resolved: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useNoteComments = (noteId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ['note-comments', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_comments')
        .select('*')
        .eq('note_id', noteId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as NoteComment[];
    },
    enabled: !!noteId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!noteId) return;

    const channel = supabase
      .channel(`note-comments-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_comments',
          filter: `note_id=eq.${noteId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId, refetch]);

  const createComment = useMutation({
    mutationFn: async (data: {
      note_id: string;
      body: any;
      mentions?: string[];
    }) => {
      const { data: comment, error } = await supabase
        .from('note_comments')
        .insert({
          note_id: data.note_id,
          body: data.body,
          user_id: user!.id,
          mentions: data.mentions || [],
        })
        .select()
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-comments'] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const { data, error } = await supabase
        .from('note_comments')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-comments'] });
      toast.success('Comment updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('note_comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-comments'] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });

  const resolveComment = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { data, error } = await supabase
        .from('note_comments')
        .update({ resolved })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-comments'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });

  return {
    comments,
    isLoading,
    createComment,
    updateComment,
    deleteComment,
    resolveComment,
  };
};

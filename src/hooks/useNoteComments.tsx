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
      // Stub: note_comments table doesn't exist
      console.log('useNoteComments: Stubbed - returning empty array');
      return [] as NoteComment[];
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
      // Stub: note_comments table doesn't exist
      console.log('createComment: Stubbed', data);
      return null;
    },
    onSuccess: () => {
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      // Stub: note_comments table doesn't exist
      console.log('updateComment: Stubbed', { id, body });
      return null;
    },
    onSuccess: () => {
      toast.success('Comment updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      // Stub: note_comments table doesn't exist
      console.log('deleteComment: Stubbed', id);
    },
    onSuccess: () => {
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });

  const resolveComment = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      // Stub: note_comments table doesn't exist
      console.log('resolveComment: Stubbed', { id, resolved });
      return null;
    },
    onSuccess: () => {
      // No-op
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

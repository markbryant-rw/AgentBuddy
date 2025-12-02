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
      // Stub: note_links table doesn't exist
      console.log('useNoteLinks: Stubbed - returning empty array');
      return [] as NoteLink[];
    },
    enabled: !!noteId,
  });

  const createLink = useMutation({
    mutationFn: async (data: {
      note_id: string;
      target_type: 'task' | 'project' | 'listing' | 'message';
      target_id: string;
    }) => {
      // Stub: note_links table doesn't exist
      console.log('createLink: Stubbed', data);
      return null;
    },
    onSuccess: () => {
      toast.success('Link created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create link');
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      // Stub: note_links table doesn't exist
      console.log('deleteLink: Stubbed', id);
    },
    onSuccess: () => {
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
      // Stub: note_links table doesn't exist
      console.log('useReverseNoteLinks: Stubbed - returning empty array');
      return [];
    },
    enabled: !!targetId,
  });

  return { links, isLoading };
};

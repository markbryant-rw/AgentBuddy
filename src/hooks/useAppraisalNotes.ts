import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AppraisalNote {
  id: string;
  appraisal_id: string;
  author_id: string | null;
  source: 'manual' | 'beacon_survey' | 'system';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useAppraisalNotes = (appraisalId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['appraisal-notes', appraisalId],
    queryFn: async () => {
      if (!appraisalId) return [];

      // Fetch notes
      const { data: notesData, error } = await supabase
        .from('appraisal_notes')
        .select('*')
        .eq('appraisal_id', appraisalId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appraisal notes:', error);
        return [];
      }

      if (!notesData || notesData.length === 0) return [];

      // Get unique author IDs
      const authorIds = [...new Set(notesData.filter(n => n.author_id).map(n => n.author_id))];
      
      // Fetch author profiles
      let authorsMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', authorIds);
        
        if (profiles) {
          authorsMap = profiles.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, { full_name: string | null; avatar_url: string | null }>);
        }
      }

      // Combine notes with authors
      return notesData.map(note => ({
        ...note,
        source: note.source as 'manual' | 'beacon_survey' | 'system',
        metadata: note.metadata as Record<string, any>,
        author: note.author_id ? authorsMap[note.author_id] : undefined,
      })) as AppraisalNote[];
    },
    enabled: !!appraisalId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ content, metadata }: { content: string; metadata?: Record<string, any> }) => {
      if (!appraisalId || !user?.id) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('appraisal_notes')
        .insert({
          appraisal_id: appraisalId,
          author_id: user.id,
          source: 'manual',
          content,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-notes', appraisalId] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('appraisal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-notes', appraisalId] });
    },
  });

  return {
    notes,
    isLoading,
    addNote: addNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutateAsync,
    isAddingNote: addNoteMutation.isPending,
  };
};

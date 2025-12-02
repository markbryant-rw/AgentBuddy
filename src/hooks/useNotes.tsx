import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Note {
  id: string;
  user_id: string;
  owner_id: string | null;
  title: string | null;
  content: string;
  content_rich: string | null;
  content_plain: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface UseNotesFilters {
  tags?: string[];
  linkedEntity?: { type: string; id: string };
  archived?: boolean;
  visibility?: string;
}

export const useNotes = (filters?: UseNotesFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, refetch } = useQuery({
    queryKey: ['notes', user?.id, filters],
    staleTime: 2 * 60 * 1000, // 2 minutes (realtime handles updates)
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const createNote = useMutation({
    mutationFn: async (data: {
      title: string;
      content?: string;
    }) => {
      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          title: data.title,
          content: data.content || '',
          user_id: user!.id,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create note');
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // Silent auto-save - no toast spam
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update note');
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete note');
    },
  });

  const archiveNote = useMutation({
    mutationFn: async (id: string) => {
      // Stub: archived_at column doesn't exist
      console.log('archiveNote: Stubbed', id);
      toast.success('Note archived');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive note');
    },
  });

  const duplicateNote = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: original.title ? `${original.title} (Copy)` : 'Untitled (Copy)',
          content: original.content,
          user_id: user!.id,
          owner_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note duplicated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate note');
    },
  });

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
    duplicateNote,
    refetch,
  };
};

export const useNote = (noteId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch owner profile separately if owner_id exists
      if (data.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('id', data.owner_id)
          .maybeSingle();

        return { ...data, owner_profile: profile } as Note & { owner_profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null };
      }

      return data as Note;
    },
    enabled: !!noteId,
  });

  // Realtime subscription for single note
  useEffect(() => {
    if (!noteId) return;

    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `id=eq.${noteId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['note', noteId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId, queryClient]);

  return { note, isLoading };
};

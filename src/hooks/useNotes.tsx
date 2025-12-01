import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Note {
  id: string;
  team_id: string | null;
  owner_id: string;
  title: string;
  content_rich: any;
  content_plain: string | null;
  tags: string[];
  visibility: string;
  is_pinned: boolean;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  search_vector: unknown;
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
        .select(`
          id, team_id, owner_id, title, content_rich, content_plain,
          tags, visibility, is_pinned, is_template, created_at,
          updated_at, archived_at
        `)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (filters?.archived !== undefined) {
        if (filters.archived) {
          query = query.not('archived_at', 'is', null);
        } else {
          query = query.is('archived_at', null);
        }
      } else {
        query = query.is('archived_at', null);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

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
      content_rich?: any;
      team_id: string;
      visibility?: string;
      tags?: string[];
      template_id?: string;
    }) => {
      let content = data.content_rich || { type: 'doc', content: [] };

      // If template_id provided, fetch template content
      if (data.template_id) {
        const { data: template } = await supabase
          .from('note_templates')
          .select('content_rich')
          .eq('id', data.template_id)
          .single();
        
        if (template) {
          content = template.content_rich;
        }
      }

      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          title: data.title,
          content_rich: content,
          team_id: data.team_id,
          owner_id: user!.id,
          visibility: data.visibility || 'team',
          tags: data.tags || [],
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
      const { error } = await supabase
        .from('notes')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note archived');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive note');
    },
  });

  const duplicateNote = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('notes')
        .select(`
          team_id, owner_id, title, content_rich, tags,
          visibility, is_pinned, is_template
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...original,
          id: undefined,
          title: `${original.title} (Copy)`,
          created_at: undefined,
          updated_at: undefined,
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
        .select('id, team_id, owner_id, title, content_rich, content_plain, tags, visibility, is_pinned, is_template, created_at, updated_at, archived_at')
        .eq('id', noteId!)
        .single();

      if (error) throw error;

      // Fetch owner profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', data.owner_id)
        .single();

      return { ...data, owner_profile: profile } as Note & { owner_profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null };
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Reaction {
  emoji: string;
  users: string[];
}

export interface TransactionNote {
  id: string;
  transaction_id: string;
  author_id: string;
  body: string;
  reactions: Reaction[];
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const useTransactionNotes = (transactionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['transaction-notes', transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      
      const { data, error } = await supabase
        .from('transaction_notes')
        .select(`
          *,
          author:profiles!author_id(full_name, avatar_url)
        `)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(note => ({
        ...note,
        reactions: (note.reactions as any) || []
      })) as TransactionNote[];
    },
    enabled: !!transactionId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`transaction-notes:${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_notes',
          filter: `transaction_id=eq.${transactionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, queryClient]);

  const createNote = useMutation({
    mutationFn: async (body: string) => {
      if (!transactionId || !user) throw new Error('Missing transaction or user');

      const { data, error } = await supabase
        .from('transaction_notes')
        .insert({
          transaction_id: transactionId,
          author_id: user.id,
          body,
          reactions: [],
        })
        .select(`
          *,
          author:profiles!author_id(full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
      toast.success('Note added');
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast.error('Failed to add note');
    },
  });

  const addReaction = useMutation({
    mutationFn: async ({ noteId, emoji }: { noteId: string; emoji: string }) => {
      if (!user) throw new Error('No user');

      const note = notes.find(n => n.id === noteId);
      if (!note) throw new Error('Note not found');

      const reactions = [...note.reactions];
      const reactionIndex = reactions.findIndex(r => r.emoji === emoji);

      if (reactionIndex >= 0) {
        const userIndex = reactions[reactionIndex].users.indexOf(user.id);
        if (userIndex >= 0) {
          reactions[reactionIndex].users.splice(userIndex, 1);
          if (reactions[reactionIndex].users.length === 0) {
            reactions.splice(reactionIndex, 1);
          }
        } else {
          reactions[reactionIndex].users.push(user.id);
        }
      } else {
        reactions.push({ emoji, users: [user.id] });
      }

      const { data, error } = await supabase
        .from('transaction_notes')
        .update({ reactions: reactions as any, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
    },
    onError: (error) => {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_notes')
        .delete()
        .eq('id', id)
        .eq('author_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });

  return {
    notes,
    isLoading,
    createNote,
    addReaction,
    deleteNote,
  };
};

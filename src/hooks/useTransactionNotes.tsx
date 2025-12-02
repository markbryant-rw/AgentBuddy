import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

// Stubbed hook - transaction_notes table not yet implemented
export const useTransactionNotes = (transactionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['transaction-notes', transactionId],
    queryFn: async (): Promise<TransactionNote[]> => {
      // Table not implemented - return empty array
      return [];
    },
    enabled: !!transactionId,
  });

  const createNote = useMutation({
    mutationFn: async (body: string) => {
      toast.info('Transaction notes coming soon');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
    },
  });

  const addReaction = useMutation({
    mutationFn: async ({ noteId, emoji }: { noteId: string; emoji: string }) => {
      toast.info('Transaction notes coming soon');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      toast.info('Transaction notes coming soon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-notes', transactionId] });
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
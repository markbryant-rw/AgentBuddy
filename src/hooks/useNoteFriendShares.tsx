import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useNoteFriendShares = (noteId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['note-shares', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_shares')
        .select('user_id, invited_by')
        .eq('note_id', noteId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!noteId,
  });

  const updateShares = useMutation({
    mutationFn: async (friendIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      // Delete all existing shares
      await supabase
        .from('note_shares')
        .delete()
        .eq('note_id', noteId);

      // Insert new shares
      if (friendIds.length > 0) {
        const { error } = await supabase
          .from('note_shares')
          .insert(
            friendIds.map(friendId => ({
              note_id: noteId,
              user_id: friendId,
              invited_by: user.id,
              permission: 'view',
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Friend sharing updated');
    },
    onError: () => {
      toast.error('Failed to update friend sharing');
    },
  });

  return {
    shares,
    isLoading,
    updateShares: updateShares.mutateAsync,
  };
};

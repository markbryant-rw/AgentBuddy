import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FixDataOptions {
  strategy: 'move_users' | 'remove_teams' | 'duplicate_teams';
  affectedUserIds?: string[];
}

export const useFixCrossOfficeData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: FixDataOptions) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-cross-office-data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fix cross-office data');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['data-health'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-offices'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-offices'] });
      
      toast.success(`Fixed ${data.fixed} cross-office assignments`, {
        description: 'Data integrity restored',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to fix data', {
        description: error.message,
      });
    },
  });
};

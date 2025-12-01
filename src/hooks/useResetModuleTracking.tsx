import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export const useResetModuleTracking = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      logger.info('Resetting module tracking', { userId: user.id });

      const { error } = await supabase
        .from('module_usage_stats')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        logger.error('Failed to reset module tracking', error);
        throw error;
      }

      logger.info('Module tracking reset successfully', { userId: user.id });
    },
    onSuccess: () => {
      // Invalidate queries to trigger immediate UI update
      queryClient.invalidateQueries({ queryKey: ['topModules', user?.id] });
      
      toast.success('Quick Access reset successfully', {
        description: 'Visit modules to rebuild your Quick Access bar',
      });
    },
    onError: (error) => {
      toast.error('Failed to reset Quick Access', {
        description: 'Please try again or contact support',
      });
      logger.error('Reset mutation failed', error);
    },
  });

  return {
    resetTracking: mutation.mutate,
    isResetting: mutation.isPending,
  };
};

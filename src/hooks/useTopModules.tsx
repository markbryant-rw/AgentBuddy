import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

/**
 * Hook that fetches and tracks the top 4 most-visited modules in real-time
 * Updates instantly when module_usage_stats changes
 */
export const useTopModules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: topModules = [], isLoading: loading } = useQuery({
    queryKey: ['topModules', user?.id],
    queryFn: async () => {
      if (!user) {
        logger.debug('Top modules fetch skipped - no user');
        return [];
      }

      try {
        logger.debug('Fetching top modules', { userId: user.id });
        
        const { data, error } = await supabase
          .from('module_usage_stats')
          .select('module_id, visit_count')
          .eq('user_id', user.id)
          .order('visit_count', { ascending: false })
          .limit(4);

        if (error) {
          logger.error('Error fetching top modules', error, { userId: user.id });
          throw error;
        }

        logger.info('Top modules fetched', { 
          userId: user.id,
          count: data?.length || 0,
          modules: data?.map(m => ({ id: m.module_id, visits: m.visit_count }))
        });

        return data?.map(m => m.module_id) || [];
      } catch (error) {
        logger.error('Error fetching top modules', error, { userId: user.id });
        return [];
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to real-time changes in module_usage_stats
    const channel = supabase
      .channel('module-usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_usage_stats',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate React Query cache to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['topModules', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return { topModules, loading };
};

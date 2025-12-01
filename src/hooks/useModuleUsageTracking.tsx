import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export const useModuleUsageTracking = (moduleId: string | null) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !moduleId) {
      logger.debug('Module tracking skipped', { 
        hasUser: !!user, 
        moduleId,
        reason: !user ? 'No user' : 'No moduleId'
      });
      return;
    }

    logger.info('Tracking module visit', { userId: user.id, moduleId });

    // Track module visit immediately (no throttling for real-time updates)
    const trackVisit = async () => {
      try {
        // Try to increment using the RPC function first
        logger.debug('Calling increment_module_visit RPC', { userId: user.id, moduleId });
        
        const { data: rpcData, error: rpcError } = await supabase.rpc('increment_module_visit', {
          p_user_id: user.id,
          p_module_id: moduleId,
        });

        if (rpcError) {
          logger.warn('RPC increment failed, trying INSERT', { 
            error: rpcError.message, 
            code: rpcError.code,
            details: rpcError.details 
          });

          // If RPC fails (likely because no record exists), create initial record
          const { data: insertData, error: insertError } = await supabase
            .from('module_usage_stats')
            .insert({
              user_id: user.id,
              module_id: moduleId,
              visit_count: 1,
              last_visited_at: new Date().toISOString(),
            })
            .select();

          if (insertError) {
            logger.error('Failed to insert module usage record', insertError, {
              userId: user.id,
              moduleId,
              errorCode: insertError.code,
              errorDetails: insertError.details,
            });
            
            toast({
              title: "Tracking Error",
              description: `Failed to track module visit: ${insertError.message}`,
              variant: "destructive",
            });
          } else {
            logger.info('Successfully created initial module usage record', { 
              userId: user.id, 
              moduleId,
              data: insertData 
            });
          }
        } else {
          logger.info('Successfully incremented module visit', { 
            userId: user.id, 
            moduleId,
            rpcData 
          });
        }
      } catch (error) {
        logger.error('Unexpected error tracking module visit', error, {
          userId: user.id,
          moduleId,
        });
        
        toast({
          title: "Tracking Error",
          description: "An unexpected error occurred while tracking your module visit.",
          variant: "destructive",
        });
      }
    };

    trackVisit();
  }, [user, moduleId]);
};

export const getMostUsedModules = async (userId: string, limit: number = 4) => {
  try {
    logger.debug('Fetching most used modules', { userId, limit });
    
    const { data, error } = await supabase
      .from('module_usage_stats')
      .select('module_id, visit_count')
      .eq('user_id', userId)
      .order('visit_count', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching most used modules', error, { userId, limit });
      throw error;
    }

    logger.info('Fetched most used modules', { 
      userId, 
      count: data?.length || 0,
      modules: data?.map(m => ({ id: m.module_id, visits: m.visit_count }))
    });

    return data?.map(m => m.module_id) || [];
  } catch (error) {
    logger.error('Error fetching most used modules', error, { userId, limit });
    return [];
  }
};

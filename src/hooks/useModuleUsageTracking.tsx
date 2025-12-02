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
      // Stub: module_usage_stats table and increment_module_visit RPC don't exist
      logger.info('Module visit tracking stubbed', { userId: user.id, moduleId });
    };

    trackVisit();
  }, [user, moduleId]);
};

export const getMostUsedModules = async (userId: string, limit: number = 4) => {
  // Stub: module_usage_stats table doesn't exist
  logger.debug('getMostUsedModules: Stubbed - returning empty array', { userId, limit });
  return [];
};

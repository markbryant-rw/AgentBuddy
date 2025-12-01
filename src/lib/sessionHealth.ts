import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const checkSessionHealth = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    
    // Verify profile exists and has required fields
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, primary_team_id, office_id')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      logger.error('Session health check failed', error);
      return false;
    }
    
    return !!profile?.primary_team_id;
  } catch (error) {
    logger.error('Error checking session health', error);
    return false;
  }
};

export const refreshSession = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Failed to refresh session', error);
    }
  } catch (error) {
    logger.error('Error refreshing session', error);
  }
};

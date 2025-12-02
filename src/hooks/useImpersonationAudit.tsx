import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ImpersonationLog {
  id: string;
  admin_id: string;
  impersonated_user_id: string;
  reason: string;
  started_at: string;
  ended_at: string | null;
  actions_taken: string[] | null;
  admin_name: string;
  admin_email: string;
  admin_avatar: string | null;
  target_name: string;
  target_email: string;
  target_avatar: string | null;
  duration_minutes: number | null;
  is_active: boolean;
}

export const useImpersonationAudit = () => {
  return useQuery({
    queryKey: ['impersonation-audit'],
    queryFn: async (): Promise<ImpersonationLog[]> => {
      // Stub: admin_impersonation_log table does not exist
      console.log('useImpersonationAudit: Stubbed - returning empty array');
      return [];
    },
  });
};

export const useImpersonationStats = () => {
  return useQuery({
    queryKey: ['impersonation-stats'],
    queryFn: async () => {
      // Stub: admin_impersonation_log table does not exist
      console.log('useImpersonationStats: Stubbed - returning zeros');
      return {
        totalSessions: 0,
        activeSessions: 0,
        mostImpersonatedUser: null,
        mostActiveAdmin: null,
      };
    },
  });
};

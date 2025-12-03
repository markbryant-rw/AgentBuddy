// Stubbed - Admin impersonation logging is a deferred feature
// These hooks return empty data until the feature is implemented

import { useQuery } from '@tanstack/react-query';

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
      // Feature not yet implemented - return empty array
      return [];
    },
  });
};

export const useImpersonationStats = () => {
  return useQuery({
    queryKey: ['impersonation-stats'],
    queryFn: async () => {
      // Feature not yet implemented - return empty stats
      return {
        totalSessions: 0,
        activeSessions: 0,
        mostImpersonatedUser: null,
        mostActiveAdmin: null,
      };
    },
  });
};

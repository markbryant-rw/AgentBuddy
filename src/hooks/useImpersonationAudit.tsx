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
      const { data, error } = await supabase
        .from('admin_impersonation_log')
        .select(`
          id,
          admin_id,
          impersonated_user_id,
          reason,
          started_at,
          ended_at,
          actions_taken,
          admin:admin_id (
            full_name,
            email,
            avatar_url
          ),
          target:impersonated_user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching impersonation audit logs:', error);
        throw error;
      }

      // Transform the data to match ImpersonationLog interface
      return (data || []).map((log: any) => ({
        id: log.id,
        admin_id: log.admin_id,
        impersonated_user_id: log.impersonated_user_id,
        reason: log.reason,
        started_at: log.started_at,
        ended_at: log.ended_at,
        actions_taken: log.actions_taken,
        admin_name: log.admin?.full_name || 'Unknown Admin',
        admin_email: log.admin?.email || '',
        admin_avatar: log.admin?.avatar_url || null,
        target_name: log.target?.full_name || 'Unknown User',
        target_email: log.target?.email || '',
        target_avatar: log.target?.avatar_url || null,
        duration_minutes: log.ended_at
          ? Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000)
          : null,
        is_active: !log.ended_at,
      }));
    },
  });
};

export const useImpersonationStats = () => {
  return useQuery({
    queryKey: ['impersonation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_impersonation_log')
        .select('id, admin_id, impersonated_user_id, ended_at');

      if (error) {
        console.error('Error fetching impersonation stats:', error);
        return {
          totalSessions: 0,
          activeSessions: 0,
          mostImpersonatedUser: null,
          mostActiveAdmin: null,
        };
      }

      const logs = data || [];
      const activeSessions = logs.filter(log => !log.ended_at).length;

      // Count by user
      const userCounts = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.impersonated_user_id] = (acc[log.impersonated_user_id] || 0) + 1;
        return acc;
      }, {});

      // Count by admin
      const adminCounts = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.admin_id] = (acc[log.admin_id] || 0) + 1;
        return acc;
      }, {});

      const mostImpersonatedUserId = Object.keys(userCounts).reduce((a, b) =>
        userCounts[a] > userCounts[b] ? a : b, ''
      );

      const mostActiveAdminId = Object.keys(adminCounts).reduce((a, b) =>
        adminCounts[a] > adminCounts[b] ? a : b, ''
      );

      return {
        totalSessions: logs.length,
        activeSessions,
        mostImpersonatedUser: mostImpersonatedUserId || null,
        mostActiveAdmin: mostActiveAdminId || null,
      };
    },
  });
};

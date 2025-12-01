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
          *,
          admin:profiles!admin_id(full_name, email, avatar_url),
          target:profiles!impersonated_user_id(full_name, email, avatar_url)
        `)
        .order('started_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((log: any) => {
        const startTime = new Date(log.started_at).getTime();
        const endTime = log.ended_at ? new Date(log.ended_at).getTime() : Date.now();
        const durationMs = endTime - startTime;
        const durationMinutes = Math.floor(durationMs / 60000);

        return {
          id: log.id,
          admin_id: log.admin_id,
          impersonated_user_id: log.impersonated_user_id,
          reason: log.reason,
          started_at: log.started_at,
          ended_at: log.ended_at,
          actions_taken: log.actions_taken,
          admin_name: log.admin?.full_name || 'Unknown',
          admin_email: log.admin?.email || '',
          admin_avatar: log.admin?.avatar_url || null,
          target_name: log.target?.full_name || 'Unknown',
          target_email: log.target?.email || '',
          target_avatar: log.target?.avatar_url || null,
          duration_minutes: log.ended_at ? durationMinutes : null,
          is_active: !log.ended_at,
        };
      });
    },
  });
};

export const useImpersonationStats = () => {
  return useQuery({
    queryKey: ['impersonation-stats'],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('admin_impersonation_log')
        .select('*');

      if (error) throw error;

      const totalSessions = logs?.length || 0;
      const activeSessions = logs?.filter((log: any) => !log.ended_at).length || 0;

      // Most impersonated user
      const userCounts = logs?.reduce((acc: any, log: any) => {
        const userId = log.impersonated_user_id;
        acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      }, {});

      const mostImpersonatedUserId = userCounts
        ? Object.entries(userCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]
        : null;

      let mostImpersonatedUser = null;
      if (mostImpersonatedUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', mostImpersonatedUserId)
          .single();
        
        mostImpersonatedUser = profile?.full_name || profile?.email || 'Unknown';
      }

      // Most active admin
      const adminCounts = logs?.reduce((acc: any, log: any) => {
        const adminId = log.admin_id;
        acc[adminId] = (acc[adminId] || 0) + 1;
        return acc;
      }, {});

      const mostActiveAdminId = adminCounts
        ? Object.entries(adminCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]
        : null;

      let mostActiveAdmin = null;
      if (mostActiveAdminId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', mostActiveAdminId)
          .single();
        
        mostActiveAdmin = profile?.full_name || profile?.email || 'Unknown';
      }

      return {
        totalSessions,
        activeSessions,
        mostImpersonatedUser,
        mostActiveAdmin,
      };
    },
  });
};

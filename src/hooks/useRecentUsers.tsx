import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  teamCount: number;
  roles: string[];
}

export const useRecentUsers = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recent-users', limit],
    queryFn: async (): Promise<RecentUser[]> => {
      // Get recent users
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get team counts and roles for each user
      const enrichedUsers = await Promise.all(
        (users || []).map(async (user) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { data: teamMember } = await supabase
            .from('team_members')
            .select('access_level')
            .eq('user_id', user.id)
            .single();

          return {
            ...user,
            teamCount: count || 0,
            roles: teamMember?.access_level ? [teamMember.access_level] : [],
          };
        })
      );

      return enrichedUsers;
    },
  });
};

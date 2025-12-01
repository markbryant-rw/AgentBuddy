import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserDetail {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  office_id: string | null;
  primary_team_id: string | null;
  created_at: string;
  mobile_number: string | null;
  birthday: string | null;
  is_orphaned: boolean;
  office?: {
    id: string;
    name: string;
  } | null;
  primary_team?: {
    id: string;
    name: string;
  } | null;
  roles: Array<{
    role: string;
    assigned_at: string | null;
    revoked_at: string | null;
    assigned_by: string | null;
  }>;
  team_memberships: Array<{
    team_id: string;
    team_name: string;
    access_level: string;
  }>;
}

export const usePlatformUserDetail = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['platform-user-detail', userId],
    queryFn: async (): Promise<UserDetail | null> => {
      if (!userId) return null;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url,
          status,
          office_id,
          primary_team_id,
          created_at,
          mobile_number,
          birthday
        `)
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile) return null;

      // Fetch office details
      let officeData = null;
      if (profile.office_id) {
        const { data: office } = await supabase
          .from('agencies')
          .select('id, name')
          .eq('id', profile.office_id)
          .single();
        officeData = office;
      }

      // Fetch primary team details
      let primaryTeamData = null;
      if (profile.primary_team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', profile.primary_team_id)
          .single();
        primaryTeamData = team;
      }

      // Fetch roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, assigned_at, revoked_at, assigned_by')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      // Fetch team memberships
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select(`
          team_id,
          access_level,
          teams:team_id (
            name
          )
        `)
        .eq('user_id', userId);

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        status: profile.status,
        office_id: profile.office_id,
        primary_team_id: profile.primary_team_id,
        created_at: profile.created_at,
        mobile_number: profile.mobile_number,
        birthday: profile.birthday,
        is_orphaned: !profile.office_id || !profile.primary_team_id,
        office: officeData,
        primary_team: primaryTeamData,
        roles: roles || [],
        team_memberships: teamMemberships?.map((tm: any) => ({
          team_id: tm.team_id,
          team_name: tm.teams?.name || 'Unknown Team',
          access_level: tm.access_level,
        })) || [],
      };
    },
    enabled: !!userId,
  });
};

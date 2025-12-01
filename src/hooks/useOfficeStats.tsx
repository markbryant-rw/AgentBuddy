import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateCCH } from '@/lib/cchCalculations';

export const useOfficeStats = (officeId?: string | null) => {
  const { user } = useAuth();

  const { data: officeData, isLoading, refetch } = useQuery({
    queryKey: ['office-stats-v2', officeId, user?.id],
    queryFn: async () => {
      if (!officeId) return null;

      // Get agency details directly using the provided officeId
      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', officeId)
        .single();

      if (!agency) return null;

      const agencyId = agency.id;

      // Get all teams in this agency (excluding personal/solo agent teams)
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, logo_url, created_by, team_type')
        .eq('agency_id', agencyId)
        .eq('is_archived', false)
        .eq('is_personal_team', false);

      if (!teams) return { agency, teams: [] };

      // Get all team memberships for these teams
      const teamIds = teams.map(t => t.id);
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id, user_id, access_level')
        .in('team_id', teamIds);

      // Get all member user IDs
      const allMemberIds = [...new Set(teamMemberships?.map(m => m.user_id) || [])];

      // Fetch profiles separately (direct query, RLS works correctly)
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, presence_status, last_active_at')
        .in('id', allMemberIds);

      // Get week start
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Get all KPIs for all teams this week
      const { data: kpiEntries } = await supabase
        .from('kpi_entries')
        .select('user_id, kpi_type, value')
        .in('user_id', allMemberIds)
        .gte('entry_date', weekStartStr);

      // Calculate stats for each team
      const teamsWithStats = teams.map(team => {
        const members = teamMemberships?.filter(m => m.team_id === team.id) || [];
        const memberIds = members.map(m => m.user_id);
        const teamKpis = kpiEntries?.filter(e => memberIds.includes(e.user_id)) || [];
        
        let teamCCH = 0;
        const membersWithStats = members.map(m => {
          const profile = memberProfiles?.find(p => p.id === m.user_id);
          const userKpis = teamKpis.filter(e => e.user_id === m.user_id);
          const calls = userKpis.filter(e => e.kpi_type === 'calls').reduce((s, e) => s + e.value, 0);
          const appraisals = userKpis.filter(e => e.kpi_type === 'appraisals').reduce((s, e) => s + e.value, 0);
          const openHomes = userKpis.filter(e => e.kpi_type === 'open_homes').reduce((s, e) => s + e.value, 0);
          const memberCCH = calculateCCH(calls, appraisals, openHomes).total;
          teamCCH += memberCCH;

          return {
            id: profile?.id || m.user_id,
            user_id: m.user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url,
            presence_status: profile?.presence_status || 'offline',
            last_active_at: profile?.last_active_at,
            access_level: m.access_level,
            week_cch: memberCCH,
          };
        });

        const avgCCH = members.length > 0 ? teamCCH / members.length : 0;
        const leader = membersWithStats.find(m => m.access_level === 'admin');

        return {
          id: team.id,
          name: team.name,
          logo_url: team.logo_url,
          team_type: team.team_type,
          memberCount: members.length,
          teamCCH,
          avgCCH,
          leader,
          members: membersWithStats,
        };
      });

      // Sort by performance (avg CCH) by default
      teamsWithStats.sort((a, b) => b.avgCCH - a.avgCCH);

      return {
        agency,
        teams: teamsWithStats,
      };
    },
    enabled: !!officeId && !!user,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    officeData,
    loading: isLoading,
    refetch,
  };
};

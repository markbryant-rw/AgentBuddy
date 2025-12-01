import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateCCH } from '@/lib/cchCalculations';

export const useTeamStats = () => {
  const { user } = useAuth();

  const { data: teamData, isLoading, refetch } = useQuery({
    queryKey: ['team-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's team (only one team per user now)
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership?.team_id) return null;

      const teamId = membership.team_id;

      // Get team details separately to avoid type inference issues
      const { data: team } = await supabase
        .from('teams')
        .select('id, name, logo_url, agency_id')
        .eq('id', teamId)
        .single();

      if (!team) return null;

      // Get agency name
      const { data: agency } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', team.agency_id)
        .single();

      // Get all team members first
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('user_id, access_level')
        .eq('team_id', teamId);

      const memberUserIds = teamMemberships?.map(m => m.user_id) || [];

      // Fetch profiles separately to ensure RLS is applied correctly
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, presence_status, last_active_at')
        .in('id', memberUserIds);

      // Combine team memberships with profiles
      const members = teamMemberships?.map(tm => {
        const profile = memberProfiles?.find(p => p.id === tm.user_id);
        return {
          user_id: tm.user_id,
          access_level: tm.access_level,
          profiles: profile
        };
      });

      // Get team KPI data (this week)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data: kpiEntries } = await supabase
        .from('kpi_entries')
        .select('user_id, kpi_type, value')
        .in('user_id', memberUserIds)
        .gte('entry_date', weekStartStr);

      // Get team goal (if exists)
      const { data: goal } = await supabase
        .from('team_goals')
        .select('target_cch, week_start_date')
        .eq('team_id', teamId)
        .eq('week_start_date', weekStartStr)
        .maybeSingle();

      // Calculate team CCH
      let teamCCH = 0;
      const memberStats = memberUserIds.map(userId => {
        const userKpis = kpiEntries?.filter(e => e.user_id === userId) || [];
        const calls = userKpis.filter(e => e.kpi_type === 'calls').reduce((s, e) => s + e.value, 0);
        const appraisals = userKpis.filter(e => e.kpi_type === 'appraisals').reduce((s, e) => s + e.value, 0);
        const openHomes = userKpis.filter(e => e.kpi_type === 'open_homes').reduce((s, e) => s + e.value, 0);
        const cch = calculateCCH(calls, appraisals, openHomes).total;
        teamCCH += cch;
        return { userId, cch };
      });

      // Check who logged activity today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLogs } = await supabase
        .from('daily_log_tracker')
        .select('user_id')
        .eq('log_date', today)
        .in('user_id', memberUserIds);

      const activeToday = todayLogs?.map(l => l.user_id) || [];

      return {
        team: {
          id: team.id,
          name: team.name,
          logo_url: team.logo_url,
          agency_id: team.agency_id,
          agency_name: agency?.name,
        },
        members: members?.map(m => ({
          ...m.profiles,
          access_level: m.access_level,
          is_active_today: activeToday.includes(m.user_id),
          week_cch: memberStats.find(s => s.userId === m.user_id)?.cch || 0,
        })),
        teamCCH,
        goal: goal?.target_cch || null,
        activeCount: activeToday.length,
        totalCount: members?.length || 0,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    teamData,
    loading: isLoading,
    refetch,
  };
};

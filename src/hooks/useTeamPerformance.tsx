import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, startOfQuarter, endOfQuarter } from 'date-fns';
import { calculateCCH } from '@/lib/cchCalculations';

export interface TeamMemberPerformance {
  userId: string;
  name: string;
  avatar: string | null;
  weekly: {
    calls: number;
    appraisals: number;
    openHomes: number;
    cch: number;
  };
  quarterly: {
    calls: number;
    appraisals: number;
    openHomes: number;
    cch: number;
  };
}

export const useTeamPerformance = (userId: string, teamId?: string) => {
  return useQuery({
    queryKey: ['team-performance', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const quarterStart = format(startOfQuarter(new Date()), 'yyyy-MM-dd');
      const quarterEnd = format(endOfQuarter(new Date()), 'yyyy-MM-dd');

      // Get team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, profiles(full_name, avatar_url)')
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      // Get activities for all team members
      const memberIds = teamMembers?.map(m => m.user_id) || [];
      
      const { data: activities, error: activitiesError } = await supabase
        .from('daily_activities')
        .select('*')
        .in('user_id', memberIds)
        .gte('activity_date', quarterStart)
        .lte('activity_date', quarterEnd);

      if (activitiesError) throw activitiesError;

      // Aggregate data by user
      const teamPerformance: TeamMemberPerformance[] = teamMembers?.map(member => {
        const userActivities = activities?.filter(a => a.user_id === member.user_id) || [];
        
        const weeklyActivities = userActivities.filter(a => 
          a.activity_date >= weekStart && a.activity_date <= weekEnd
        );
        
        const weeklyTotals = weeklyActivities.reduce(
          (acc, a) => ({
            calls: acc.calls + (a.calls || 0),
            appraisals: acc.appraisals + (a.appraisals || 0),
            openHomes: acc.openHomes + (a.open_homes || 0),
          }),
          { calls: 0, appraisals: 0, openHomes: 0 }
        );

        const quarterlyTotals = userActivities.reduce(
          (acc, a) => ({
            calls: acc.calls + (a.calls || 0),
            appraisals: acc.appraisals + (a.appraisals || 0),
            openHomes: acc.openHomes + (a.open_homes || 0),
          }),
          { calls: 0, appraisals: 0, openHomes: 0 }
        );

        const weeklyCCH = calculateCCH(weeklyTotals.calls, weeklyTotals.appraisals, weeklyTotals.openHomes);
        const quarterlyCCH = calculateCCH(quarterlyTotals.calls, quarterlyTotals.appraisals, quarterlyTotals.openHomes);

        return {
          userId: member.user_id,
          name: (member.profiles as any)?.full_name || 'Unknown',
          avatar: (member.profiles as any)?.avatar_url || null,
          weekly: {
            ...weeklyTotals,
            cch: weeklyCCH.total,
          },
          quarterly: {
            ...quarterlyTotals,
            cch: quarterlyCCH.total,
          },
        };
      }) || [];

      return teamPerformance;
    },
    enabled: !!userId && !!teamId,
  });
};

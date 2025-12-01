import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, addWeeks } from 'date-fns';

interface TeamMemberBreakdown {
  userId: string;
  userName: string;
  calls: number;
  appraisals: number;
  openHomes: number;
}

export const useTeamWeeklyBreakdown = (teamId: string | null, weekOffset: number = 0) => {
  return useQuery({
    queryKey: ['team-weekly-breakdown', teamId, weekOffset],
    queryFn: async () => {
      if (!teamId) return null;

      const baseDate = new Date();
      const targetWeekStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
      const weekStart = format(targetWeekStart, 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(targetWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Get team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('user_id, profiles(id, full_name, email)')
        .eq('team_id', teamId);

      if (membersError) throw membersError;

      // Get activities for all team members for this week
      const { data: activities, error: activitiesError } = await supabase
        .from('daily_activities')
        .select('*')
        .in('user_id', teamMembers?.map(tm => tm.user_id) || [])
        .gte('activity_date', weekStart)
        .lte('activity_date', weekEnd);

      if (activitiesError) throw activitiesError;

      // Aggregate by user
      const breakdown: TeamMemberBreakdown[] = teamMembers?.map(member => {
        const userActivities = activities?.filter(a => a.user_id === member.user_id) || [];
        
        const totals = userActivities.reduce(
          (acc, a) => ({
            calls: acc.calls + (a.calls || 0),
            appraisals: acc.appraisals + (a.appraisals || 0),
            openHomes: acc.openHomes + (a.open_homes || 0),
          }),
          { calls: 0, appraisals: 0, openHomes: 0 }
        );

        return {
          userId: member.user_id,
          userName: (member.profiles as any)?.full_name || (member.profiles as any)?.email || 'Unknown',
          ...totals,
        };
      }) || [];

      return breakdown;
    },
    enabled: !!teamId,
  });
};

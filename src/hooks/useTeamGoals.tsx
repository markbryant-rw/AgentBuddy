import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface TeamGoal {
  id: string;
  kpi_type: string;
  target_value: number;
  team_id: string;
}

export interface MemberGoal {
  id: string;
  user_id: string;
  kpi_type: string;
  target_value: number;
  set_by_admin: boolean;
  admin_notes?: string;
  userName?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  contributes_to_kpis: boolean;
  full_name?: string;
}

export const useTeamGoals = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const [teamGoals, setTeamGoals] = useState<TeamGoal[]>([]);
  const [memberGoals, setMemberGoals] = useState<MemberGoal[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamGoals = useCallback(async () => {
    if (!user || !team) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch team-level goals
      const { data: teamGoalsData, error: teamGoalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('team_id', team.id)
        .eq('goal_type', 'team')
        .eq('period', 'weekly')
        .is('user_id', null);

      if (teamGoalsError) throw teamGoalsError;

      // Fetch team members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, profiles(full_name)')
        .eq('team_id', team.id);

      if (membersError) throw membersError;

      const members = membersData?.map(m => ({
        id: m.id,
        user_id: m.user_id,
        contributes_to_kpis: m.contributes_to_kpis,
        full_name: (m.profiles as any)?.full_name || 'Unknown',
      })) || [];

      // Fetch all member individual goals
      const memberIds = members.map(m => m.user_id);
      const { data: memberGoalsData, error: memberGoalsError } = await supabase
        .from('goals')
        .select('*')
        .in('user_id', memberIds)
        .eq('goal_type', 'individual')
        .eq('period', 'weekly');

      if (memberGoalsError) throw memberGoalsError;

      // Optimize: Create Map for O(1) lookups instead of O(n) find() in map()
      const userIdToMemberMap = new Map(members.map(m => [m.user_id, m]));
      const goalsWithNames = memberGoalsData?.map(g => ({
        ...g,
        userName: userIdToMemberMap.get(g.user_id)?.full_name || 'Unknown',
      })) || [];

      setTeamGoals(teamGoalsData || []);
      setMemberGoals(goalsWithNames);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team goals:', error);
    } finally {
      setLoading(false);
    }
  }, [user, team]);

  const updateTeamGoal = async (kpiType: string, targetValue: number) => {
    if (!user || !team) throw new Error('User or team not found');

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const existingGoal = teamGoals.find(g => g.kpi_type === kpiType);

    if (existingGoal) {
      await supabase
        .from('goals')
        .update({ target_value: targetValue })
        .eq('id', existingGoal.id);
    } else {
      await supabase
        .from('goals')
        .insert([{
          team_id: team.id,
          kpi_type: kpiType as any,
          target_value: targetValue,
          period: 'weekly',
          goal_type: 'team',
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(weekEnd, 'yyyy-MM-dd'),
          created_by: user.id,
        }]);
    }

    await fetchTeamGoals();
  };

  const updateMemberGoal = async (
    userId: string,
    kpiType: string,
    targetValue: number,
    adminNotes?: string
  ) => {
    if (!user || !team) throw new Error('User or team not found');

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const existingGoal = memberGoals.find(
      g => g.user_id === userId && g.kpi_type === kpiType
    );

    if (existingGoal) {
      await supabase
        .from('goals')
        .update({
          target_value: targetValue,
          set_by_admin: true,
          admin_notes: adminNotes,
        })
        .eq('id', existingGoal.id);

      // Create notification for the user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'goal_adjusted',
        title: 'Your targets were adjusted',
        message: `Admin updated your ${kpiType} target to ${targetValue}`,
        metadata: {
          kpi_type: kpiType,
          new_value: targetValue,
          admin_notes: adminNotes,
          adjusted_by: user.id,
        },
      });
    } else {
      await supabase
        .from('goals')
        .insert([{
          user_id: userId,
          team_id: team.id,
          kpi_type: kpiType as any,
          target_value: targetValue,
          period: 'weekly',
          goal_type: 'individual',
          start_date: format(weekStart, 'yyyy-MM-dd'),
          end_date: format(weekEnd, 'yyyy-MM-dd'),
          created_by: user.id,
          set_by_admin: true,
          admin_notes: adminNotes,
        }]);
    }

    await fetchTeamGoals();
  };

  const toggleMemberContribution = async (teamMemberId: string, contributes: boolean) => {
    if (!user) throw new Error('User not found');

    await supabase
      .from('team_members')
      .update({ contributes_to_kpis: contributes })
      .eq('id', teamMemberId);

    await fetchTeamGoals();
  };

  useEffect(() => {
    fetchTeamGoals();
  }, [fetchTeamGoals]);

  return {
    teamGoals,
    memberGoals,
    teamMembers,
    loading,
    updateTeamGoal,
    updateMemberGoal,
    toggleMemberContribution,
    refetch: fetchTeamGoals,
  };
};

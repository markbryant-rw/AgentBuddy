import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeam } from "./useTeam";
import { logger } from "@/lib/logger";

export const useTeamMembers = () => {
  const { team } = useTeam();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", team?.id],
    queryFn: async () => {
      if (!team) {
        logger.log('[useTeamMembers] No team found, returning empty array');
        return [];
      }

      logger.log('[useTeamMembers] Fetching members for team', { teamId: team.id });

      const { data, error } = await supabase
        .from("team_members")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email,
            mobile,
            birthday,
            birthday_visibility,
            presence_status,
            last_active_at
          )
        `)
        .eq("team_id", team.id);

      // Fetch roles for all team members
      const userIds = data?.map(m => m.user_id) || [];
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .is("revoked_at", null);

      if (error) {
        logger.error('[useTeamMembers] Error fetching members', error);
        throw error;
      }

      // Group roles by user_id
      const rolesByUser = (rolesData || []).reduce((acc, r) => {
        if (!acc[r.user_id]) acc[r.user_id] = [];
        acc[r.user_id].push(r.role);
        return acc;
      }, {} as Record<string, string[]>);

      const mappedMembers = data.map((member) => {
        const profile = member.profiles as any;
        return {
          ...member,
          ...profile,
          // Explicitly set id to user_id to ensure it matches listings.assigned_to
          id: profile?.id || member.user_id,
          roles: rolesByUser[member.user_id] || [],
        };
      });

      // Sort by role priority: team_leader -> salesperson -> assistant
      const rolePriority: Record<string, number> = { 
        team_leader: 0, 
        salesperson: 1, 
        assistant: 2 
      };
      
      const sortedMembers = mappedMembers.sort((a, b) => {
        const aRole = a.roles?.find((r: string) => rolePriority[r] !== undefined);
        const bRole = b.roles?.find((r: string) => rolePriority[r] !== undefined);
        const aPriority = aRole ? rolePriority[aRole] : 99;
        const bPriority = bRole ? rolePriority[bRole] : 99;
        return aPriority - bPriority;
      });

      logger.log('[useTeamMembers] Fetched members', { count: sortedMembers.length });

      return sortedMembers;
    },
    enabled: !!team,
  });

  return { members, isLoading };
};

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
            email
          )
        `)
        .eq("team_id", team.id);

      if (error) {
        logger.error('[useTeamMembers] Error fetching members', error);
        throw error;
      }

      const mappedMembers = data.map((member) => {
        const profile = member.profiles as any;
        return {
          ...member,
          ...profile,
          // Explicitly set id to user_id to ensure it matches listings.assigned_to
          id: profile?.id || member.user_id,
        };
      });

      logger.log('[useTeamMembers] Fetched members', { count: mappedMembers.length });

      return mappedMembers;
    },
    enabled: !!team,
  });

  return { members, isLoading };
};

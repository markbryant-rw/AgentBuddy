import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useTeam } from "./useTeam";

export const useUserSearch = (searchTerm: string) => {
  const { user } = useAuth();
  const { team } = useTeam();

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['user-search', searchTerm, team?.id],
    queryFn: async () => {
      if (!team?.id || searchTerm.length < 2) return [];

      // Search profiles by email or name
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      if (!profiles) return [];

      // Get current team members to filter them out
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      const existingIds = teamMembers?.map(m => m.user_id) || [];

      // Filter out current user and existing team members
      return profiles.filter(p => 
        p.id !== user?.id && 
        !existingIds.includes(p.id)
      );
    },
    enabled: !!team?.id && searchTerm.length >= 2,
  });

  return { searchResults, isLoading };
};

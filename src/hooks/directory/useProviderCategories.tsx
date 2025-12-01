import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

export interface ProviderCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_team_category?: boolean;
}

export const useProviderCategories = () => {
  const { user } = useAuth();
  const { team } = useTeam();

  return useQuery({
    queryKey: ['provider-categories', team?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch default categories
      const { data: defaultCategories, error: defaultError } = await supabase
        .from('provider_categories')
        .select('id, name, icon, color')
        .eq('is_active', true)
        .order('sort_order');

      if (defaultError) throw defaultError;

      // Fetch team-specific categories if team exists
      let teamCategories: any[] = [];
      if (team) {
        const { data: teamCats, error: teamError } = await supabase
          .from('team_provider_categories')
          .select('id, name, icon, color')
          .eq('team_id', team.id)
          .eq('is_active', true)
          .order('name');

        if (teamError) throw teamError;
        teamCategories = (teamCats || []).map(cat => ({ ...cat, is_team_category: true }));
      }

      // Merge both lists
      const allCategories: ProviderCategory[] = [
        ...(defaultCategories || []).map(cat => ({ ...cat, is_team_category: false })),
        ...teamCategories,
      ];

      return allCategories;
    },
    enabled: !!user,
  });
};

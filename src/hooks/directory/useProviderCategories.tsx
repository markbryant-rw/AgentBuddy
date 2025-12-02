import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

export interface ProviderCategory {
  id: string;
  name: string;
  icon: string | null;
  color?: string;
  is_team_category?: boolean;
}

export const useProviderCategories = () => {
  const { user } = useAuth();
  const { team } = useTeam();

  return useQuery<ProviderCategory[]>({
    queryKey: ['provider-categories', team?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('provider_categories')
        .select('id, name, icon')
        .order('name');

      if (error) throw error;

      return (data || []).map((cat: any) => ({
        ...cat,
        is_team_category: false,
      }));
    },
    enabled: !!user,
  });
};

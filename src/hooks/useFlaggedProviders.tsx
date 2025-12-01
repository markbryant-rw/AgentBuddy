import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from './useOfficeSwitcher';

interface FlaggedProvider {
  id: string;
  full_name: string;
  company_name: string | null;
  negative_count: number;
  neutral_count: number;
  positive_count: number;
  total_reviews: number;
  flagged_at: string;
  provider_categories: {
    name: string;
    icon: string;
    color: string;
  } | null;
  team_provider_categories: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

export function useFlaggedProviders() {
  const { activeOffice } = useOfficeSwitcher();

  return useQuery({
    queryKey: ['flagged-providers', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];

      const { data, error } = await supabase
        .from('service_providers')
        .select(`
          id,
          full_name,
          company_name,
          negative_count,
          neutral_count,
          positive_count,
          total_reviews,
          flagged_at,
          provider_categories (name, icon, color),
          team_provider_categories (name, icon, color)
        `)
        .not('flagged_at', 'is', null)
        .eq('teams.agency_id', activeOffice.id)
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FlaggedProvider[];
    },
    enabled: !!activeOffice?.id,
  });
}

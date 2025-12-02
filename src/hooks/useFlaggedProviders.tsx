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
      // Stub: service_providers table structure is different and related tables don't exist
      console.log('useFlaggedProviders: Stubbed - returning empty array');
      return [] as FlaggedProvider[];
    },
    enabled: !!activeOffice?.id,
  });
}

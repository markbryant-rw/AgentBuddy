import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfficeCardData {
  id: string;
  name: string;
  logo_url: string | null;
  total_users: number;
  total_teams: number;
  active_users: number;
  salesperson_count: number;
  assistant_count: number;
  team_leader_count: number;
}

export const usePlatformOffices = () => {
  return useQuery({
    queryKey: ['platform-offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_platform_offices_stats');
      
      if (error) throw error;
      return data as OfficeCardData[];
    },
  });
};

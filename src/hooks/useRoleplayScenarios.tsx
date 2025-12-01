import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoleplayScenario } from "@/types/roleplay";

export const useRoleplayScenarios = (type?: 'buyer' | 'seller', callType?: 'inbound' | 'outbound') => {
  return useQuery({
    queryKey: ['roleplay-scenarios', type, callType],
    queryFn: async () => {
      let query = supabase
        .from('roleplay_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('difficulty', { ascending: true })
        .order('scenario_name', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      if (callType) {
        query = query.eq('call_type', callType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RoleplayScenario[];
    },
  });
};

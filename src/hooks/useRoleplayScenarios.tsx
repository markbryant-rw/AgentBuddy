import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoleplayScenario {
  id: string;
  title: string;
  description: string | null;
  prompt: string;
  category: string | null;
  difficulty: string;
  objectives: any;
  rating: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useRoleplayScenarios = (type?: 'buyer' | 'seller', callType?: 'inbound' | 'outbound') => {
  return useQuery({
    queryKey: ['roleplay-scenarios', type, callType],
    queryFn: async () => {
      let query = (supabase as any)
        .from('roleplay_scenarios')
        .select('*')
        .order('difficulty', { ascending: true })
        .order('title', { ascending: true });

      if (type) {
        query = query.eq('category', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as RoleplayScenario[];
    },
  });
};
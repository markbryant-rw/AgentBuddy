import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getQuarter } from 'date-fns';

export const usePlaybookQuarterlyGoals = (userId: string) => {
  return useQuery({
    queryKey: ['playbook-quarterly-goals', userId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const currentQuarter = getQuarter(new Date());

      const { data, error } = await supabase
        .from('quarterly_goals' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .eq('quarter', currentQuarter)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (data as any) || null;
    },
    enabled: !!userId,
  });
};

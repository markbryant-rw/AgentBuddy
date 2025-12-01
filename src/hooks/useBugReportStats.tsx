import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth } from 'date-fns';

export const useBugReportStats = () => {
  return useQuery({
    queryKey: ['bug-report-stats'],
    queryFn: async () => {
      const { data: bugs, error } = await supabase
        .from('bug_reports')
        .select('status, severity, fixed_at');

      if (error) throw error;

      const total = bugs?.length || 0;
      const critical = bugs?.filter(b => b.severity === 'critical').length || 0;
      const pending = bugs?.filter(b => b.status === 'triage').length || 0;
      
      const monthStart = startOfMonth(new Date()).toISOString();
      const fixedThisMonth = bugs?.filter(b => 
        b.fixed_at && new Date(b.fixed_at) >= new Date(monthStart)
      ).length || 0;

      // Get top bug hunters
      const { data: hunters, error: huntersError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, total_bug_points')
        .order('total_bug_points', { ascending: false })
        .limit(3);

      if (huntersError) throw huntersError;

      return {
        total,
        critical,
        pending,
        fixedThisMonth,
        topHunters: hunters || [],
      };
    },
  });
};

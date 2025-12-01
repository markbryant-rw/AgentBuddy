import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TeamAssignmentIssue {
  issue_type: string;
  user_id: string;
  user_email: string;
  primary_team_id: string;
  team_name: string;
  description: string;
}

export const useDataHealth = (officeId?: string | null) => {
  return useQuery({
    queryKey: ['data-health', officeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detect_team_assignment_issues');

      if (error) throw error;

      return (data || []) as TeamAssignmentIssue[];
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });
};

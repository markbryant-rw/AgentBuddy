import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEMO_AGENCY_ID = 'a0000000-0000-0000-0000-000000000001';

export function useDemoMode() {
  const { data: profile } = useQuery({
    queryKey: ['current-profile-demo-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('office_id, email')
        .eq('id', user.id)
        .single();
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isDemoMode = profile?.office_id === DEMO_AGENCY_ID || profile?.email === 'demo@agentbuddy.co';

  return {
    isDemoMode,
    demoAgencyId: DEMO_AGENCY_ID,
  };
}

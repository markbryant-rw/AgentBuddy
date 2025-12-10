import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface HotLead {
  id: string;
  address: string;
  vendorName: string | null;
  propensityScore: number | null;
  lastActivity: string | null;
}

export const useOvernightHotLeads = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['overnight-hot-leads', user?.id],
    queryFn: async (): Promise<HotLead[]> => {
      if (!user?.id) return [];

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamMember?.team_id) return [];

      // Get hot leads from last 24 hours
      const yesterday = subDays(new Date(), 1);

      const { data: hotLeads } = await supabase
        .from('logged_appraisals')
        .select('id, address, vendor_name, beacon_propensity_score, beacon_last_activity')
        .eq('team_id', teamMember.team_id)
        .eq('beacon_is_hot_lead', true)
        .gte('beacon_last_activity', yesterday.toISOString())
        .order('beacon_propensity_score', { ascending: false })
        .limit(5);

      return (hotLeads || []).map((lead) => ({
        id: lead.id,
        address: lead.address,
        vendorName: lead.vendor_name,
        propensityScore: lead.beacon_propensity_score,
        lastActivity: lead.beacon_last_activity,
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};

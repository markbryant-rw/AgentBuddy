import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BeaconEngagementEvent {
  id: string;
  appraisal_id: string;
  event_type: 'view' | 'email_open' | 'link_click';
  occurred_at: string;
  duration_seconds: number;
  metadata: Record<string, any>;
  created_at: string;
}

export const useBeaconEngagementEvents = (appraisalId: string | undefined) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['beacon_engagement_events', appraisalId],
    queryFn: async () => {
      if (!appraisalId) return [] as BeaconEngagementEvent[];
      
      const { data, error } = await supabase
        .from('beacon_engagement_events')
        .select('*')
        .eq('appraisal_id', appraisalId)
        .order('occurred_at', { ascending: false });

      if (error) {
        console.error('Error fetching beacon events:', error);
        return [] as BeaconEngagementEvent[];
      }

      return (data || []) as BeaconEngagementEvent[];
    },
    enabled: !!appraisalId,
  });

  return { events, isLoading };
};

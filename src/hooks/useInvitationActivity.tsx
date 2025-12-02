import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvitationActivity {
  id: string;
  invitation_id: string;
  activity_type: string;
  actor_id: string | null;
  recipient_email: string;
  team_id: string | null;
  office_id: string | null;
  error_reason: string | null;
  metadata: any;
  created_at: string;
  actor?: {
    full_name: string;
    email: string;
  };
  team?: {
    name: string;
  };
}

interface InvitationActivityFilters {
  teamId?: string;
  officeId?: string;
  activityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export const useInvitationActivity = (filters?: InvitationActivityFilters) => {
  return useQuery({
    queryKey: ['invitation-activity', filters],
    queryFn: async () => {
      // Stub: invitation_activity_log table does not exist
      console.log('useInvitationActivity: Stubbed - returning empty array');
      return [] as InvitationActivity[];
    },
  });
};

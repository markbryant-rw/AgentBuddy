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
      let query = supabase
        .from('invitation_activity_log')
        .select(`
          *,
          actor:profiles!actor_id(full_name, email),
          team:teams(name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (filters?.teamId) query = query.eq('team_id', filters.teamId);
      if (filters?.officeId) query = query.eq('office_id', filters.officeId);
      if (filters?.activityType) query = query.eq('activity_type', filters.activityType);
      if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom.toISOString());
      if (filters?.dateTo) query = query.lte('created_at', filters.dateTo.toISOString());
      if (filters?.search) query = query.ilike('recipient_email', `%${filters.search}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InvitationActivity[];
    },
  });
};

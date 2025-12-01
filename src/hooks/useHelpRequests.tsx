import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface HelpRequest {
  id: string;
  created_by: string;
  team_id: string | null;
  office_id: string | null;
  title: string;
  description: string;
  category: 'tech_issue' | 'coaching_help' | 'listing_issue' | 'training_request' | 'other';
  status: 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'closed';
  escalation_level: 'team_leader' | 'office_manager' | 'platform_admin';
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useHelpRequests = () => {
  const { user, activeRole } = useAuth();
  const queryClient = useQueryClient();

  // Fetch help requests based on user's role
  // RLS policies on the backend will handle filtering based on role
  const { data: helpRequests, isLoading } = useQuery({
    queryKey: ['help-requests', user?.id, activeRole],
    queryFn: async () => {
      if (!user) return [];

      // Query all requests - RLS will automatically filter based on user's permissions
      let query = supabase
        .from('help_requests')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching help requests:', error);
        throw error;
      }
      return data as HelpRequest[];
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Create help request
  const createHelpRequest = useMutation({
    mutationFn: async (request: {
      title: string;
      description: string;
      category: HelpRequest['category'];
      team_id?: string;
      office_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('help_requests')
        .insert({
          ...request,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      toast.success('Help request submitted successfully');
    },
    onError: (error) => {
      console.error('Error creating help request:', error);
      toast.error('Failed to submit help request');
    },
  });

  // Update help request
  const updateHelpRequest = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<HelpRequest>;
    }) => {
      const { data, error } = await supabase
        .from('help_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      toast.success('Help request updated');
    },
    onError: (error) => {
      console.error('Error updating help request:', error);
      toast.error('Failed to update help request');
    },
  });

  // Escalate help request
  const escalateHelpRequest = useMutation({
    mutationFn: async (id: string) => {
      const request = helpRequests?.find((r) => r.id === id);
      if (!request) throw new Error('Help request not found');

      let newLevel: HelpRequest['escalation_level'] = request.escalation_level;
      if (request.escalation_level === 'team_leader') {
        newLevel = 'office_manager';
      } else if (request.escalation_level === 'office_manager') {
        newLevel = 'platform_admin';
      }

      const { data, error } = await supabase
        .from('help_requests')
        .update({
          escalation_level: newLevel,
          status: 'escalated',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      toast.success('Help request escalated');
    },
    onError: (error) => {
      console.error('Error escalating help request:', error);
      toast.error('Failed to escalate help request');
    },
  });

  // Resolve help request
  const resolveHelpRequest = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('help_requests')
        .update({
          status: 'resolved',
          resolved_by: user!.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      toast.success('Help request resolved');
    },
    onError: (error) => {
      console.error('Error resolving help request:', error);
      toast.error('Failed to resolve help request');
    },
  });

  return {
    helpRequests,
    isLoading,
    createHelpRequest: createHelpRequest.mutate,
    updateHelpRequest: updateHelpRequest.mutate,
    escalateHelpRequest: escalateHelpRequest.mutate,
    resolveHelpRequest: resolveHelpRequest.mutate,
    isCreating: createHelpRequest.isPending,
  };
};

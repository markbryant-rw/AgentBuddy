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

  // Stub: help_requests table does not exist
  const { data: helpRequests = [], isLoading } = useQuery({
    queryKey: ['help-requests', user?.id, activeRole],
    queryFn: async () => {
      console.log('useHelpRequests: Stubbed - returning empty array');
      return [] as HelpRequest[];
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const createHelpRequest = useMutation({
    mutationFn: async (request: {
      title: string;
      description: string;
      category: HelpRequest['category'];
      team_id?: string;
      office_id?: string;
    }) => {
      console.log('createHelpRequest: Stubbed', request);
      return null;
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

  const updateHelpRequest = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<HelpRequest>;
    }) => {
      console.log('updateHelpRequest: Stubbed', { id, updates });
      return null;
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

  const escalateHelpRequest = useMutation({
    mutationFn: async (id: string) => {
      console.log('escalateHelpRequest: Stubbed', { id });
      return null;
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

  const resolveHelpRequest = useMutation({
    mutationFn: async (id: string) => {
      console.log('resolveHelpRequest: Stubbed', { id });
      return null;
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

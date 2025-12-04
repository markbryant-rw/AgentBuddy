import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

export interface FeatureRequestVote {
  id: string;
  user_id: string;
  feature_request_id: string;
}

// Upload files to storage
const uploadFiles = async (files: File[], userId: string): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('feedback-attachments')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('feedback-attachments')
      .getPublicUrl(fileName);

    return publicUrl;
  });

  return Promise.all(uploadPromises);
};

export const useFeatureRequests = (statusFilter: string = 'all') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all feature requests
  const { data: featureRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['feature-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('feature_requests')
        .select('*, profiles(full_name)');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Smart sorting: status priority, then vote count, then recency
      const statusPriority: Record<string, number> = {
        'pending': 0,
        'in_progress': 1,
        'completed': 2,
        'declined': 3,
        'archived': 4
      };

      return (data || []).sort((a, b) => {
        // Status priority first (pending/in_progress first, completed/declined/archived at bottom)
        const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        
        // Then by vote count (descending)
        if ((b.vote_count || 0) !== (a.vote_count || 0)) {
          return (b.vote_count || 0) - (a.vote_count || 0);
        }
        
        // Then by recency (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }) as FeatureRequest[];
    },
    enabled: !!user,
  });

  // Fetch user's votes
  const { data: userVotes = [] } = useQuery({
    queryKey: ['user-votes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_request_votes')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data as FeatureRequestVote[];
    },
    enabled: !!user,
  });

  const votesRemaining = 5 - userVotes.length;

  // Toggle vote mutation
  const toggleVoteMutation = useMutation({
    mutationFn: async (featureRequestId: string) => {
      const existingVote = userVotes.find(
        (v) => v.feature_request_id === featureRequestId
      );

      if (existingVote) {
        // Remove vote
        const { error } = await supabase
          .from('feature_request_votes')
          .delete()
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Add vote
        if (userVotes.length >= 5) {
          throw new Error('You have used all 5 votes');
        }

        const { error } = await supabase
          .from('feature_request_votes')
          .insert({
            user_id: user!.id,
            feature_request_id: featureRequestId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-votes'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Submit new request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; attachments?: File[] }) => {
      if (!user) throw new Error('User not authenticated');

      let attachmentUrls: string[] = [];
      if (data.attachments && data.attachments.length > 0) {
        attachmentUrls = await uploadFiles(data.attachments, user.id);
      }

      const { error } = await supabase
        .from('feature_requests')
        .insert({
          title: data.title,
          description: data.description,
          user_id: user.id,
          status: 'pending',
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Feature request submitted!');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });

  // Delete feature request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('feature_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Feature request deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete feature request: ' + error.message);
    },
  });

  return {
    featureRequests,
    isLoadingRequests,
    userVotes,
    votesRemaining,
    toggleVote: toggleVoteMutation.mutate,
    isTogglingVote: toggleVoteMutation.isPending,
    submitRequest: submitRequestMutation.mutate,
    isSubmitting: submitRequestMutation.isPending,
    deleteRequest: deleteRequestMutation.mutate,
    isDeleting: deleteRequestMutation.isPending,
  };
};

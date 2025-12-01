import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ProviderReview {
  id: string;
  provider_id: string;
  user_id: string;
  parent_review_id: string | null;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  is_usage_note: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useProviderReviews = (providerId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading, refetch, error } = useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: async () => {
      console.log('[DEBUG] Fetching reviews for provider:', providerId);
      
      const { data, error } = await supabase
        .from('provider_reviews')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DEBUG] Review fetch error:', error);
        throw error;
      }
      
      console.log('[DEBUG] Reviews fetched successfully:', data?.length || 0);
      
      return (data || []) as any as ProviderReview[];
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 500,
  });

  const addReview = useMutation({
    mutationFn: async ({ 
      content, 
      sentiment, 
      isUsageNote = false, 
      parentReviewId 
    }: { 
      content: string; 
      sentiment: 'positive' | 'neutral' | 'negative';
      isUsageNote?: boolean; 
      parentReviewId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('provider_reviews')
        .insert({
          provider_id: providerId,
          user_id: user.id,
          content,
          sentiment,
          is_usage_note: isUsageNote,
          parent_review_id: parentReviewId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ['provider-reviews', providerId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active'
      });
      toast.success('Review added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add review: ' + error.message);
    },
  });

  const updateReview = useMutation({
    mutationFn: async ({ 
      reviewId, 
      content, 
      sentiment 
    }: { 
      reviewId: string; 
      content: string; 
      sentiment: 'positive' | 'neutral' | 'negative';
    }) => {
      const { data, error } = await supabase
        .from('provider_reviews')
        .update({ 
          content,
          sentiment,
        })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ['provider-reviews', providerId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active'
      });
      toast.success('Review updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update review: ' + error.message);
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('provider_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ['provider-reviews', providerId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active'
      });
      toast.success('Review deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete review: ' + error.message);
    },
  });

  return {
    reviews,
    isLoading,
    refetch,
    error,
    addReview,
    updateReview,
    deleteReview,
  };
};
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

const mapRatingToSentiment = (rating: number | null): 'positive' | 'neutral' | 'negative' => {
  if (rating === null || rating === undefined) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
};

const mapSentimentToRating = (sentiment: 'positive' | 'neutral' | 'negative'): number => {
  if (sentiment === 'positive') return 5;
  if (sentiment === 'negative') return 1;
  return 3;
};

export const useProviderReviews = (providerId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading, refetch, error } = useQuery<ProviderReview[]>({
    queryKey: ['provider-reviews', providerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('service_provider_reviews')
        .select(`
          id,
          provider_id,
          user_id,
          review,
          rating,
          created_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        provider_id: row.provider_id,
        user_id: row.user_id,
        parent_review_id: null,
        content: row.review || '',
        sentiment: mapRatingToSentiment(row.rating ?? null),
        is_usage_note: false,
        created_at: row.created_at,
        updated_at: row.created_at,
        profiles: row.profiles,
      }));
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
  });

  const addReview = useMutation({
    mutationFn: async ({ 
      content, 
      sentiment, 
      isUsageNote = false, 
      parentReviewId, 
    }: { 
      content: string; 
      sentiment: 'positive' | 'neutral' | 'negative';
      isUsageNote?: boolean; 
      parentReviewId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('service_provider_reviews')
        .insert({
          provider_id: providerId,
          user_id: user.id,
          review: content,
          rating: mapSentimentToRating(sentiment),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ['provider-reviews', providerId],
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active',
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
      sentiment, 
    }: { 
      reviewId: string; 
      content: string; 
      sentiment: 'positive' | 'neutral' | 'negative';
    }) => {
      const { data, error } = await (supabase as any)
        .from('service_provider_reviews')
        .update({ 
          review: content,
          rating: mapSentimentToRating(sentiment),
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
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active',
      });
      toast.success('Review updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update review: ' + error.message);
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await (supabase as any)
        .from('service_provider_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: ['provider-reviews', providerId],
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['service-providers'],
        refetchType: 'active',
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

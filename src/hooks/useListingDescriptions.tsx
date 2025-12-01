import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from '@/hooks/use-toast';

export interface GenerateParams {
  address: string;
  bedrooms: number;
  bathrooms: number;
  listingType: string;
  targetAudience: string;
  additionalFeatures?: string;
}

export interface GeneratedDescriptions {
  short: string;
  medium: string;
  long: string;
}

export interface ListingDescription {
  id: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  listing_type: string;
  target_audience: string;
  additional_features: string | null;
  generated_descriptions: GeneratedDescriptions;
  created_at: string;
  updated_at: string;
}

export const useListingDescriptions = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  // Fetch user's description history
  const { data: descriptions = [], isLoading: loading } = useQuery({
    queryKey: ['listing-descriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_descriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        generated_descriptions: item.generated_descriptions as unknown as GeneratedDescriptions
      }));
    },
    enabled: !!user,
  });

  // Generate new description via edge function
  const generateDescription = useMutation({
    mutationFn: async (params: GenerateParams) => {
      const { data, error } = await supabase.functions.invoke('generate-listing-description', {
        body: {
          address: params.address,
          bedrooms: params.bedrooms,
          bathrooms: params.bathrooms,
          listingType: params.listingType,
          targetAudience: params.targetAudience,
          additionalFeatures: params.additionalFeatures,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate description');
      }

      if (!data?.descriptions) {
        throw new Error('Invalid response from generation service');
      }

      return data.descriptions as GeneratedDescriptions;
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save description to database
  const saveDescription = useMutation({
    mutationFn: async (data: {
      address: string;
      bedrooms: number;
      bathrooms: number;
      listingType: string;
      targetAudience: string;
      additionalFeatures?: string;
      descriptions: GeneratedDescriptions;
    }) => {
      const { error } = await supabase.from('listing_descriptions').insert({
        team_id: team?.id || null,
        created_by: user!.id,
        address: data.address,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        listing_type: data.listingType,
        target_audience: data.targetAudience,
        additional_features: data.additionalFeatures || null,
        generated_descriptions: data.descriptions as any,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast({
        title: 'Saved Successfully',
        description: 'Your listing description has been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update existing description
  const updateDescription = useMutation({
    mutationFn: async (data: { id: string; descriptions: GeneratedDescriptions }) => {
      const { error } = await supabase
        .from('listing_descriptions')
        .update({ generated_descriptions: data.descriptions as any })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast({
        title: 'Updated Successfully',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete description
  const deleteDescription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('listing_descriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast({
        title: 'Deleted Successfully',
        description: 'The listing description has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    descriptions,
    loading,
    generateDescription: generateDescription.mutateAsync,
    isGenerating: generateDescription.isPending,
    saveDescription: saveDescription.mutateAsync,
    isSaving: saveDescription.isPending,
    updateDescription: updateDescription.mutateAsync,
    isUpdating: updateDescription.isPending,
    deleteDescription: deleteDescription.mutateAsync,
    isDeleting: deleteDescription.isPending,
  };
};

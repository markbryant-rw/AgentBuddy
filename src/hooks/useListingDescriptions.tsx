import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
  additional_features?: string;
  generated_descriptions: GeneratedDescriptions;
  created_at: string;
}

export const useListingDescriptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: descriptions = [], isLoading: loading } = useQuery({
    queryKey: ['listing-descriptions', user?.id],
    queryFn: async (): Promise<ListingDescription[]> => {
      console.log('useListingDescriptions: Stubbed - returning empty array');
      return [];
    },
    enabled: !!user,
  });

  const generateDescription = useMutation({
    mutationFn: async (params: GenerateParams): Promise<GeneratedDescriptions | null> => {
      console.log('generateDescription: Stubbed', params);
      return null;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const saveDescription = useMutation({
    mutationFn: async (data: any) => {
      console.log('saveDescription: Stubbed', data);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast.success('Saved');
    },
  });

  const updateDescription = useMutation({
    mutationFn: async (data: any) => {
      console.log('updateDescription: Stubbed', data);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast.success('Updated');
    },
  });

  const deleteDescription = useMutation({
    mutationFn: async (id: string) => {
      console.log('deleteDescription: Stubbed', id);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-descriptions'] });
      toast.success('Deleted');
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

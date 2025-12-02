import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface LoggedAppraisal {
  id: string;
  user_id: string;
  address: string;
  appraisal_date: string;
  estimated_value?: number;
  status?: string;
  intent?: string;
  outcome?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useLoggedAppraisals = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  const { data: appraisals = [], isLoading: loading } = useQuery({
    queryKey: ['logged_appraisals', team?.id],
    queryFn: async () => {
      console.log('useLoggedAppraisals: Stubbed - returning empty array');
      return [] as LoggedAppraisal[];
    },
    enabled: !!team,
  });

  useEffect(() => {
    if (!team) return;

    // Subscribe to real-time changes
    const channel = supabase
      .channel('logged_appraisals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logged_appraisals',
        },
        (payload) => {
          console.log('Appraisal change:', payload);
          queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, team]);

  const addAppraisal = async (
    appraisal: Omit<LoggedAppraisal, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('logged_appraisals')
        .insert([{
          ...appraisal,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
      toast.success('Appraisal logged');
      
      return data as LoggedAppraisal;
    } catch (error) {
      console.error('Error adding appraisal:', error);
      toast.error('Failed to log appraisal');
    }
  };

  const updateAppraisal = async (id: string, updates: Partial<LoggedAppraisal>): Promise<void> => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('logged_appraisals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
      toast.success('Appraisal updated');
    } catch (error: any) {
      console.error('Error updating appraisal:', error);
      toast.error(error?.message || 'Failed to update appraisal');
      throw error;
    }
  };

  const deleteAppraisal = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('logged_appraisals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
      toast.success('Appraisal deleted');
    } catch (error) {
      console.error('Error deleting appraisal:', error);
      toast.error('Failed to delete appraisal');
    }
  };

  const convertToListing = async (appraisalId: string, listingData: any) => {
    if (!user || !team) return;

    try {
      // Create listing from appraisal
      const { data: listing, error: listingError } = await supabase
        .from('listings_pipeline')
        .insert({
          address: listingData.address,
          team_id: team.id,
          created_by: user.id,
          stage: listingData.stage || 'prospecting',
          estimated_value: listingData.estimated_value,
          warmth: listingData.warmth || 'cold',
          notes: listingData.notes,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Insert the logged appraisal
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('logged_appraisals')
        .insert([{
          address: listingData.address,
          appraisal_date: new Date().toISOString().split('T')[0],
          estimated_value: listingData.estimated_value,
          status: 'completed',
          outcome: 'listed',
          user_id: user.id,
        }])
        .select()
        .single();

      if (appraisalError) throw appraisalError;

      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      queryClient.invalidateQueries({ queryKey: ['listings_pipeline'] });
      toast.success('Converted to listing');
      return listing;
    } catch (error) {
      console.error('Error converting to listing:', error);
      toast.error('Failed to convert to listing');
      throw error;
    }
  };

  const stats = {
    total: appraisals.length,
    active: appraisals.filter(a => a.outcome === 'In Progress').length,
    converted: appraisals.filter(a => a.outcome === 'WON').length,
  };

  return {
    appraisals,
    loading,
    addAppraisal,
    updateAppraisal,
    deleteAppraisal,
    convertToListing,
    stats,
    refreshAppraisals: () => queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] }),
  };
};

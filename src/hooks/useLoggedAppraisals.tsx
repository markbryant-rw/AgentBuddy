import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Extended interface to match component expectations (stubbed)
export interface LoggedAppraisal {
  id: string;
  user_id: string;
  team_id?: string;
  created_by?: string;
  last_edited_by?: string;
  address: string;
  vendor_name?: string;
  vendor_mobile?: string;
  vendor_email?: string;
  suburb?: string;
  region?: string;
  appraisal_date: string;
  appraisal_range_low?: number;
  appraisal_range_high?: number;
  estimated_value?: number;
  intent?: 'low' | 'medium' | 'high';
  last_contact?: string;
  next_follow_up?: string;
  stage?: 'VAP' | 'MAP' | 'LAP';
  outcome?: 'In Progress' | 'WON' | 'LOST';
  opportunity_id?: string;
  converted_date?: string;
  loss_reason?: string;
  lead_source?: string;
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  geocode_error?: string;
  status?: string;
  notes?: string;
  attachments?: any[];
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
      if (!team?.id) return [] as LoggedAppraisal[];
      
      const { data, error } = await supabase
        .from('logged_appraisals')
        .select('*')
        .eq('team_id', team.id)
        .order('appraisal_date', { ascending: false });

      if (error) {
        console.error('Error fetching appraisals:', error);
        toast.error('Failed to load appraisals');
        return [] as LoggedAppraisal[];
      }

      return (data || []) as LoggedAppraisal[];
    },
    enabled: !!team,
  });

  useEffect(() => {
    if (!team) return;

    // Subscribe to real-time changes (stubbed)
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
    console.log('addAppraisal: Stubbed', appraisal);
    toast.success('Appraisal logged');
    return null;
  };

  const updateAppraisal = async (id: string, updates: Partial<LoggedAppraisal>): Promise<void> => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    console.log('updateAppraisal: Stubbed', { id, updates });
    toast.success('Appraisal updated');
  };

  const deleteAppraisal = async (id: string): Promise<void> => {
    console.log('deleteAppraisal: Stubbed', id);
    toast.success('Appraisal deleted');
  };

  const convertToListing = async (appraisalId: string, listingData: any) => {
    if (!user || !team) return;
    console.log('convertToListing: Stubbed', { appraisalId, listingData });
    toast.success('Converted to listing');
    return null;
  };

  const convertToOpportunity = async (appraisalId: string, opportunityData: any) => {
    if (!user || !team) return null;
    
    try {
      // Create listings_pipeline record
      const { data: opportunity, error } = await supabase
        .from('listings_pipeline')
        .insert({
          team_id: team.id,
          created_by: user.id,
          address: opportunityData.address,
          stage: opportunityData.stage || 'vap',
          warmth: opportunityData.warmth || 'warm',
          estimated_value: opportunityData.estimated_value,
          expected_month: opportunityData.expected_month,
          notes: opportunityData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Update appraisal to mark as converted
      const { error: updateError } = await supabase
        .from('logged_appraisals')
        .update({
          outcome: 'WON',
          converted_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', appraisalId);

      if (updateError) {
        console.error('Failed to update appraisal status:', updateError);
      }

      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      
      return opportunity;
    } catch (error) {
      console.error('Error converting to opportunity:', error);
      toast.error('Failed to convert to opportunity');
      return null;
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
    convertToOpportunity,
    stats,
    refreshAppraisals: () => queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] }),
  };
};

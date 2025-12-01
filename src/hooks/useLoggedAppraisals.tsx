import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface LoggedAppraisal {
  id: string;
  team_id: string;
  created_by: string;
  last_edited_by: string;
  address: string;
  vendor_name: string;
  suburb?: string;
  region?: string;
  appraisal_date: string;
  appraisal_range_low?: number;
  appraisal_range_high?: number;
  estimated_value?: number;
  appraisal_method?: 'in_person' | 'virtual' | 'desktop';
  intent: 'low' | 'medium' | 'high';
  last_contact?: string;
  next_follow_up?: string;
  stage: 'MAP' | 'LAP';
  outcome: 'In Progress' | 'WON' | 'LOST';
  opportunity_id?: string;
  converted_date?: string;
  loss_reason?: string;
  lead_source?: string;
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  geocode_error?: string;
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
      if (!team) return [];

      const { data, error } = await supabase
        .from('logged_appraisals')
        .select('id, team_id, created_by, last_edited_by, address, vendor_name, suburb, region, appraisal_date, appraisal_range_low, appraisal_range_high, estimated_value, appraisal_method, intent, last_contact, next_follow_up, stage, outcome, opportunity_id, converted_date, loss_reason, lead_source, latitude, longitude, geocoded_at, geocode_error, notes, attachments, created_at, updated_at')
        .eq('team_id', team.id)
        .order('appraisal_date', { ascending: false });

      if (error) throw error;
      return (data || []) as LoggedAppraisal[];
    },
    enabled: !!team,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
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
          filter: `team_id=eq.${team?.id}`,
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
    appraisal: Omit<LoggedAppraisal, 'id' | 'created_at' | 'updated_at' | 'team_id' | 'created_by' | 'last_edited_by'>
  ) => {
    if (!user || !team) return;

    try {
      // Sanitize date fields - convert empty strings to null
      const sanitizedAppraisal = {
        ...appraisal,
        next_follow_up: appraisal.next_follow_up || null,
        last_contact: appraisal.last_contact || null,
        converted_date: appraisal.converted_date || null,
      };

      const { data, error } = await supabase
        .from('logged_appraisals')
        .insert({
          ...sanitizedAppraisal,
          team_id: team.id,
          created_by: user.id,
          last_edited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newAppraisal = data as LoggedAppraisal;
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      toast.success('Appraisal logged');
      
      // Auto-geocode the new appraisal if it has an address
      if (newAppraisal.address) {
        try {
          await supabase.functions.invoke('geocode-appraisal', {
            body: { appraisalId: newAppraisal.id },
          });
        } catch (geocodeError) {
          console.error('Auto-geocoding failed:', geocodeError);
          // Don't show error to user, geocoding is a background task
        }
      }
      
      return newAppraisal;
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
      // Sanitize date fields - convert empty strings to null
      const sanitizedUpdates = {
        ...updates,
        next_follow_up: updates.next_follow_up || null,
        last_contact: updates.last_contact || null,
        converted_date: updates.converted_date || null,
      };

      const { data, error } = await supabase
        .from('logged_appraisals')
        .update({ ...sanitizedUpdates, last_edited_by: user.id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      toast.success('Appraisal updated');

      // Auto-geocode if address or suburb changed
      if (updates.address || updates.suburb) {
        try {
          await supabase.functions.invoke('geocode-appraisal', {
            body: { appraisalId: id },
          });
        } catch (geocodeError) {
          console.error('Auto-geocoding failed:', geocodeError);
          // Don't show error to user, geocoding is a background task
        }
      }
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
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      toast.success('Appraisal deleted');
    } catch (error) {
      console.error('Error deleting appraisal:', error);
      toast.error('Failed to delete appraisal');
    }
  };

  const convertToOpportunity = async (appraisalId: string, opportunityData: any) => {
    if (!user || !team) return;

    try {
      // Convert expected_month from YYYY-MM to YYYY-MM-01 for valid date format
      const processedData = {
        ...opportunityData,
        expected_month: opportunityData.expected_month 
          ? `${opportunityData.expected_month}-01` 
          : opportunityData.expected_month,
      };

      // Create opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('listings_pipeline')
        .insert({
          ...processedData,
          team_id: team.id,
          created_by: user.id,
          last_edited_by: user.id,
          appraisal_id: appraisalId,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Update appraisal with opportunity link
      const { error: updateError } = await supabase
        .from('logged_appraisals')
        .update({
          opportunity_id: opportunity.id,
          status: 'converted',
          converted_date: new Date().toISOString(),
          last_edited_by: user.id,
        })
        .eq('id', appraisalId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      queryClient.invalidateQueries({ queryKey: ['listings_pipeline'] });
      toast.success('Converted to opportunity');
      return opportunity;
    } catch (error) {
      console.error('Error converting to opportunity:', error);
      toast.error('Failed to convert to opportunity');
      throw error;
    }
  };

  const linkToOpportunity = async (appraisalId: string, opportunityId: string) => {
    if (!user) return;

    try {
      // Update appraisal
      await supabase
        .from('logged_appraisals')
        .update({
          opportunity_id: opportunityId,
          last_edited_by: user.id,
        })
        .eq('id', appraisalId);

      // Update opportunity
      await supabase
        .from('listings_pipeline')
        .update({
          appraisal_id: appraisalId,
          last_edited_by: user.id,
        })
        .eq('id', opportunityId);

      toast.success('Linked to opportunity');
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
      queryClient.invalidateQueries({ queryKey: ['listings_pipeline'] });
    } catch (error) {
      console.error('Error linking to opportunity:', error);
      toast.error('Failed to link to opportunity');
    }
  };

  const stats = {
    total: appraisals.length,
    active: appraisals.filter(a => a.outcome === 'In Progress').length,
    converted: appraisals.filter(a => a.outcome === 'WON').length,
    high: appraisals.filter(a => a.intent === 'high' && a.outcome === 'In Progress').length,
    medium: appraisals.filter(a => a.intent === 'medium' && a.outcome === 'In Progress').length,
    low: appraisals.filter(a => a.intent === 'low' && a.outcome === 'In Progress').length,
    conversionRate: appraisals.length > 0 
      ? ((appraisals.filter(a => a.outcome === 'WON').length / appraisals.length) * 100).toFixed(1)
      : '0',
  };

  return {
    appraisals,
    loading,
    addAppraisal,
    updateAppraisal,
    deleteAppraisal,
    convertToOpportunity,
    linkToOpportunity,
    stats,
    refreshAppraisals: () => queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] }),
  };
};

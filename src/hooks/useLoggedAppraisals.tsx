import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

export interface LoggedAppraisal {
  id: string;
  user_id: string;
  team_id?: string;
  created_by?: string;
  last_edited_by?: string;
  agent_id?: string;
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
  // Joined profile data
  agent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  // Computed field for repeat visits
  visit_number?: number;
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
        .select(`
          *,
          agent:profiles!logged_appraisals_agent_id_fkey(id, full_name, avatar_url)
        `)
        .eq('team_id', team.id)
        .order('appraisal_date', { ascending: false });

      if (error) {
        console.error('Error fetching appraisals:', error);
        toast.error('Failed to load appraisals');
        return [] as LoggedAppraisal[];
      }

      // Calculate visit numbers for repeat addresses
      const addressCounts: Record<string, number> = {};
      const sortedByDate = [...(data || [])].sort(
        (a, b) => new Date(a.appraisal_date).getTime() - new Date(b.appraisal_date).getTime()
      );
      
      sortedByDate.forEach((appraisal) => {
        const normalizedAddress = appraisal.address.toLowerCase().trim();
        addressCounts[normalizedAddress] = (addressCounts[normalizedAddress] || 0) + 1;
        (appraisal as any).visit_number = addressCounts[normalizedAddress];
      });

      return (data || []).map(a => ({
        ...a,
        agent: a.agent as LoggedAppraisal['agent'],
        visit_number: (a as any).visit_number,
      })) as LoggedAppraisal[];
    },
    enabled: !!team,
  });

  useEffect(() => {
    if (!team) return;

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
  }, [user, team, queryClient]);

  const addAppraisal = async (
    appraisal: Omit<LoggedAppraisal, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ) => {
    if (!user || !team) return null;
    
    const { data, error } = await supabase
      .from('logged_appraisals')
      .insert({
        ...appraisal,
        user_id: user.id,
        team_id: team.id,
        created_by: user.id,
        agent_id: appraisal.agent_id || user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding appraisal:', error);
      toast.error('Failed to log appraisal');
      return null;
    }

    queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
    return data;
  };

  const updateAppraisal = async (id: string, updates: Partial<LoggedAppraisal>): Promise<void> => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    
    const { error } = await supabase
      .from('logged_appraisals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating appraisal:', error);
      toast.error('Failed to update appraisal');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
  };

  const deleteAppraisal = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('logged_appraisals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appraisal:', error);
      toast.error('Failed to delete appraisal');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] });
  };

  const removeDuplicates = async (): Promise<number> => {
    if (!team?.id) return 0;

    // Group by address + appraisal_date, keep oldest
    const grouped: Record<string, LoggedAppraisal[]> = {};
    appraisals.forEach((a) => {
      const key = `${a.address.toLowerCase().trim()}_${a.appraisal_date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });

    const toDelete: string[] = [];
    Object.values(grouped).forEach((group) => {
      if (group.length > 1) {
        // Sort by created_at, keep oldest
        const sorted = group.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        // Delete all but the first (oldest)
        sorted.slice(1).forEach((a) => toDelete.push(a.id));
      }
    });

    if (toDelete.length === 0) {
      toast.info('No duplicates found');
      return 0;
    }

    const { error } = await supabase
      .from('logged_appraisals')
      .delete()
      .in('id', toDelete);

    if (error) {
      console.error('Error removing duplicates:', error);
      toast.error('Failed to remove duplicates');
      return 0;
    }

    toast.success(`Removed ${toDelete.length} duplicate(s)`);
    queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team.id] });
    return toDelete.length;
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
      // Get the appraisal to carry over agent_id
      const appraisal = appraisals.find(a => a.id === appraisalId);
      
      const { data: opportunity, error } = await supabase
        .from('listings_pipeline')
        .insert({
          team_id: team.id,
          created_by: user.id,
          assigned_to: appraisal?.agent_id || user.id,
          address: opportunityData.address,
          stage: opportunityData.stage || 'vap',
          warmth: opportunityData.warmth || 'warm',
          estimated_value: opportunityData.estimated_value,
          expected_month: opportunityData.expected_month,
          notes: opportunityData.notes,
          appraisal_id: appraisalId, // Link opportunity to source appraisal
        })
        .select()
        .single();

      if (error) throw error;

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

  // Get previous appraisals at the same address
  const getPreviousAppraisals = (address: string, currentId: string): LoggedAppraisal[] => {
    const normalizedAddress = address.toLowerCase().trim();
    return appraisals
      .filter(a => 
        a.address.toLowerCase().trim() === normalizedAddress && 
        a.id !== currentId
      )
      .sort((a, b) => new Date(b.appraisal_date).getTime() - new Date(a.appraisal_date).getTime());
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
    removeDuplicates,
    convertToListing,
    convertToOpportunity,
    getPreviousAppraisals,
    stats,
    refreshAppraisals: () => queryClient.invalidateQueries({ queryKey: ['logged_appraisals', team?.id] }),
  };
};

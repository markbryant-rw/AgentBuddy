import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface Listing {
  id: string;
  team_id: string;
  created_by: string;
  last_edited_by: string;
  address: string;
  vendor_name: string;
  warmth: 'cold' | 'warm' | 'hot';
  likelihood: number;
  expected_month: string;
  last_contact: string;
  stage?: 'call' | 'vap' | 'map' | 'lap'; // Pipeline progression stages
  outcome?: 'in_progress' | 'won' | 'lost'; // Final outcome status
  suburb?: string;
  region?: string;
  assigned_to?: string;
  estimated_value?: number;
  appraisal_date?: string;
  listing_appointment_date?: string;
  contract_signed_date?: string;
  campaign_start_date?: string;
  open_home_dates?: string[];
  lead_source?: string;
  notes?: string;
  attachments?: any[];
  archived_at?: string;
  loss_reason?: string;
  lost_date?: string;
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  geocode_error?: string;
  created_at: string;
  updated_at: string;
}

export interface ListingComment {
  id: string;
  listing_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const useListingPipeline = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { team } = useTeam();

  const fetchListings = useCallback(async () => {
    if (!user || !team) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('listings_pipeline')
        .select('*')
        .eq('team_id', team.id)
        .order('expected_month', { ascending: true });

      if (error) throw error;
      setListings((data || []).map(d => ({
        ...d,
        last_edited_by: d.created_by,
        vendor_name: '',
        likelihood: 50,
        expected_month: '',
        last_contact: '',
      })) as Listing[]);
    } catch (error) {
      logger.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [user, team]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const addListing = async (listing: Omit<Listing, 'id' | 'created_at' | 'updated_at' | 'team_id' | 'created_by' | 'last_edited_by'>) => {
    if (!user || !team) return;

    try {
      const { data, error } = await supabase
        .from('listings_pipeline')
        .insert({
          ...listing,
          team_id: team.id,
          created_by: user.id,
          last_edited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newListing = data as Listing;
      setListings(prev => [...prev, newListing]);
      toast.success('Listing added');
      
      // Auto-geocode the new listing if it has an address
      if (newListing.address) {
        try {
          await supabase.functions.invoke('geocode-listing', {
            body: { listingId: newListing.id },
          });
        } catch (geocodeError) {
          logger.error('Auto-geocoding failed:', geocodeError);
          // Don't show error to user, geocoding is a background task
        }
      }
    } catch (error: any) {
      logger.error('Error adding listing:', error);
      toast.error(`Failed to add listing: ${error?.message || 'Unknown error'}`);
    }
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      logger.info('Updating listing:', { id, updates });
      
      const { data, error } = await supabase
        .from('listings_pipeline')
        .update({ ...updates, last_edited_by: user.id })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Supabase update error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from update');
      }
      
      logger.info('Update successful:', data);

      setListings(prev => prev.map(l => l.id === id ? data as Listing : l));
      toast.success('Listing updated');

      // Auto-geocode if address or suburb changed
      if (updates.address || updates.suburb) {
        try {
          await supabase.functions.invoke('geocode-listing', {
            body: { listingId: id },
          });
        } catch (geocodeError) {
          logger.error('Auto-geocoding failed:', geocodeError);
          // Don't show error to user, geocoding is a background task
        }
      }
      
      return data;
    } catch (error: any) {
      logger.error('Error updating listing:', error);
      const errorMessage = error?.message || 'Failed to update listing';
      toast.error(errorMessage);
      throw error;
    }
  };

  const deleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('listings_pipeline')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
    } catch (error) {
      logger.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const stats = {
    total: listings.length,
    hot: listings.filter(l => l.warmth === 'hot').length,
    warm: listings.filter(l => l.warmth === 'warm').length,
    cold: listings.filter(l => l.warmth === 'cold').length,
  };

  return {
    listings,
    loading,
    addListing,
    updateListing,
    deleteListing,
    stats,
    refreshListings: fetchListings,
  };
};

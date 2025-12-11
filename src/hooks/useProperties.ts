import { supabase } from '@/integrations/supabase/client';
import { useTeam } from './useTeam';
import { useAuth } from './useAuth';

export interface Property {
  id: string;
  address: string;
  suburb?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  team_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing properties - the central anchor for property lifecycle.
 * Properties link appraisals, opportunities, transactions, and beacon reports.
 */
export const useProperties = () => {
  const { team } = useTeam();
  const { user } = useAuth();

  /**
   * Normalizes an address for matching (lowercase, trimmed, removes extra spaces)
   */
  const normalizeAddress = (address: string): string => {
    return address.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  /**
   * Find an existing property by address within the team
   */
  const findPropertyByAddress = async (address: string): Promise<Property | null> => {
    if (!team?.id) return null;

    const normalizedAddress = normalizeAddress(address);
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('team_id', team.id)
      .ilike('address', normalizedAddress)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding property:', error);
    }

    return data as Property | null;
  };

  /**
   * Create a new property record
   */
  const createProperty = async (propertyData: {
    address: string;
    suburb?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<Property | null> => {
    if (!team?.id || !user?.id) return null;

    const { data, error } = await supabase
      .from('properties')
      .insert({
        address: propertyData.address,
        suburb: propertyData.suburb,
        region: propertyData.region,
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        team_id: team.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return null;
    }

    return data as Property;
  };

  /**
   * Get or create a property - the main function for ensuring a property exists.
   * Returns an existing property if one matches by address, otherwise creates a new one.
   */
  const getOrCreateProperty = async (propertyData: {
    address: string;
    suburb?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<Property | null> => {
    if (!team?.id || !user?.id) return null;

    // First, try to find an existing property
    const existing = await findPropertyByAddress(propertyData.address);
    if (existing) {
      // Update with any new geocoding data if available
      if (propertyData.latitude && propertyData.longitude && 
          (!existing.latitude || !existing.longitude)) {
        await updateProperty(existing.id, {
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          suburb: propertyData.suburb || existing.suburb,
        });
        return { ...existing, ...propertyData };
      }
      return existing;
    }

    // Create new property
    return await createProperty(propertyData);
  };

  /**
   * Update an existing property
   */
  const updateProperty = async (id: string, updates: Partial<Property>): Promise<void> => {
    const { error } = await supabase
      .from('properties')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating property:', error);
    }
  };

  /**
   * Get a property by ID
   */
  const getPropertyById = async (id: string): Promise<Property | null> => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching property:', error);
      return null;
    }

    return data as Property;
  };

  return {
    normalizeAddress,
    findPropertyByAddress,
    createProperty,
    getOrCreateProperty,
    updateProperty,
    getPropertyById,
  };
};

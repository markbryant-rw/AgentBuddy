import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Listing } from './useListingPipeline';

interface GeocodeError {
  listingId: string;
  address: string;
  error: string;
}

export const useListingGeocoding = () => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState<GeocodeError[]>([]);

  const geocodeListing = async (listing: Listing): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-listing', {
        body: { listingId: listing.id },
      });

      if (error) throw error;

      if (data?.success) {
        console.log(`Geocoded ${listing.address}: ${data.latitude}, ${data.longitude}`);
        return true;
      } else {
        throw new Error(data?.error || 'Geocoding failed');
      }
    } catch (error) {
      console.error(`Failed to geocode ${listing.address}:`, error);
      setErrors(prev => [...prev, {
        listingId: listing.id,
        address: listing.address,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
      return false;
    }
  };

  const geocodeAll = async (listings: Listing[]): Promise<void> => {
    // Filter listings that need geocoding
    const ungeocodedListings = listings.filter(
      l => l.latitude === null || l.latitude === undefined
    );

    if (ungeocodedListings.length === 0) {
      toast.info('All opportunities are already geocoded');
      return;
    }

    setIsGeocoding(true);
    setProgress({ current: 0, total: ungeocodedListings.length });
    setErrors([]);

    let successCount = 0;
    let failedCount = 0;

    // Save progress to localStorage
    const saveProgress = () => {
      localStorage.setItem('listing_geocoding_progress', JSON.stringify({
        current: progress.current,
        total: ungeocodedListings.length,
        timestamp: Date.now(),
      }));
    };

    toast.loading(`Geocoding ${ungeocodedListings.length} opportunities...`, {
      id: 'geocoding-progress',
    });

    for (let i = 0; i < ungeocodedListings.length; i++) {
      const listing = ungeocodedListings[i];
      
      setProgress({ current: i + 1, total: ungeocodedListings.length });
      saveProgress();

      const success = await geocodeListing(listing);
      
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Rate limiting: wait 1.1 seconds between requests
      // OpenCage free tier allows 1 request per second
      if (i < ungeocodedListings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    setIsGeocoding(false);
    localStorage.removeItem('listing_geocoding_progress');

    // Show completion toast
    toast.dismiss('geocoding-progress');
    
    if (failedCount === 0) {
      toast.success(`Successfully geocoded ${successCount} opportunities`);
    } else if (successCount === 0) {
      toast.error(`Failed to geocode all ${failedCount} opportunities`);
    } else {
      toast.warning(`Geocoded ${successCount} opportunities, ${failedCount} failed`);
    }
  };

  const retryFailed = async (listings: Listing[]): Promise<void> => {
    // Filter listings with geocode errors
    const failedListings = listings.filter(
      l => l.geocode_error !== null && l.geocode_error !== undefined
    );

    if (failedListings.length === 0) {
      toast.info('No failed opportunities to retry');
      return;
    }

    setIsGeocoding(true);
    setProgress({ current: 0, total: failedListings.length });
    setErrors([]);

    let successCount = 0;
    let failedCount = 0;

    toast.loading(`Retrying ${failedListings.length} failed opportunities...`, {
      id: 'geocoding-retry',
    });

    for (let i = 0; i < failedListings.length; i++) {
      const listing = failedListings[i];
      
      setProgress({ current: i + 1, total: failedListings.length });

      const success = await geocodeListing(listing);
      
      if (success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Rate limiting
      if (i < failedListings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    setIsGeocoding(false);

    toast.dismiss('geocoding-retry');
    
    if (failedCount === 0) {
      toast.success(`Successfully geocoded ${successCount} opportunities`);
    } else if (successCount === 0) {
      toast.error(`Failed to geocode all ${failedCount} opportunities`);
    } else {
      toast.warning(`Geocoded ${successCount} opportunities, ${failedCount} still failed`);
    }
  };

  return {
    isGeocoding,
    progress,
    errors,
    geocodeListing,
    geocodeAll,
    retryFailed,
  };
};

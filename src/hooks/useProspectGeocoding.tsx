import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoggedAppraisal } from './useLoggedAppraisals';
import { Listing } from './useListingPipeline';

export const useProspectGeocoding = () => {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeAll = async (appraisals: LoggedAppraisal[], opportunities: Listing[]) => {
    setIsGeocoding(true);

    try {
      // Get all items without coordinates
      const ungeocodedAppraisals = appraisals.filter(
        (item) => item.address && !item.latitude && !item.longitude
      );
      
      const ungeocodedOpportunities = opportunities.filter(
        (item) => item.address && !item.latitude && !item.longitude
      );

      const totalToGeocode = ungeocodedAppraisals.length + ungeocodedOpportunities.length;

      if (totalToGeocode === 0) {
        toast.info('All items are already geocoded');
        setIsGeocoding(false);
        return;
      }

      toast.info(`Geocoding ${totalToGeocode} items...`);

      // Geocode appraisals
      const appraisalResults = await Promise.allSettled(
        ungeocodedAppraisals.map(async (appraisal) => {
          const { data, error } = await supabase.functions.invoke('geocode-appraisal', {
            body: { appraisalId: appraisal.id },
          });
          if (error) throw error;
          if (data && data.success === false) throw new Error(data.error || 'Geocoding failed');
          return data;
        })
      );

      // Geocode opportunities
      const opportunityResults = await Promise.allSettled(
        ungeocodedOpportunities.map(async (opportunity) => {
          const { data, error } = await supabase.functions.invoke('geocode-listing', {
            body: { listingId: opportunity.id },
          });
          if (error) throw error;
          if (data && data.success === false) throw new Error(data.error || 'Geocoding failed');
          return data;
        })
      );

      const successfulAppraisals = appraisalResults.filter((r) => r.status === 'fulfilled').length;
      const successfulOpportunities = opportunityResults.filter((r) => r.status === 'fulfilled').length;
      const totalSuccessful = successfulAppraisals + successfulOpportunities;
      const totalFailed = totalToGeocode - totalSuccessful;

      if (totalSuccessful > 0) {
        toast.success(
          `Successfully geocoded ${totalSuccessful} of ${totalToGeocode} items`
        );
      }

      if (totalFailed > 0) {
        toast.warning(`${totalFailed} items could not be geocoded. Use 'Fix Location' on each property to set coordinates manually.`, { duration: 8000 });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to geocode items');
    } finally {
      setIsGeocoding(false);
    }
  };

  return {
    geocodeAll,
    isGeocoding,
  };
};

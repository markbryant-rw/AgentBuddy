import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BeaconReport {
  id: string;
  appraisal_id: string;
  property_id?: string;
  beacon_report_id: string;
  report_type: string;
  report_url: string | null;
  personalized_url: string | null;
  created_at: string;
  sent_at: string | null;
  propensity_score: number;
  total_views: number;
  total_time_seconds: number;
  email_opens: number;
  is_hot_lead: boolean;
  first_viewed_at: string | null;
  last_activity: string | null;
}

interface PropertyWithBeaconSlug {
  beacon_property_slug: string | null;
}

interface UseBeaconReportsOptions {
  appraisalId?: string;
  propertyId?: string;
}

/**
 * Fetch beacon reports - can query by property_id (preferred) or appraisal_id (legacy).
 * When propertyId is provided, returns ALL reports for that property across all modules.
 */
export const useBeaconReports = (idOrOptions: string | undefined | UseBeaconReportsOptions) => {
  // Support both legacy single-arg (appraisalId) and new options object
  let options: UseBeaconReportsOptions;
  if (typeof idOrOptions === 'string') {
    options = { appraisalId: idOrOptions };
  } else if (idOrOptions === undefined) {
    options = {};
  } else {
    options = idOrOptions;
  }

  const { appraisalId, propertyId } = options;

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['beacon_reports', propertyId || appraisalId],
    queryFn: async () => {
      // Prefer property_id query (shows all reports for a property)
      if (propertyId) {
        const { data, error } = await supabase
          .from('beacon_reports')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching beacon reports by property:', error);
          return [] as BeaconReport[];
        }
        return (data || []) as BeaconReport[];
      }
      
      // Fallback to appraisal_id query (legacy)
      if (!appraisalId) return [] as BeaconReport[];
      
      const { data, error } = await supabase
        .from('beacon_reports')
        .select('*')
        .eq('appraisal_id', appraisalId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching beacon reports:', error);
        return [] as BeaconReport[];
      }

      return (data || []) as BeaconReport[];
    },
    enabled: !!(appraisalId || propertyId),
  });

  // Fetch the property's beacon_property_slug if linked
  const { data: property } = useQuery({
    queryKey: ['property_beacon_slug', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const { data, error } = await supabase
        .from('properties')
        .select('beacon_property_slug')
        .eq('id', propertyId)
        .single();

      if (error) {
        console.error('Error fetching property beacon slug:', error);
        return null;
      }
      return data as PropertyWithBeaconSlug;
    },
    enabled: !!propertyId,
  });

  // Get the latest report
  const latestReport = reports.length > 0 ? reports[0] : null;

  // Calculate aggregate stats across all reports
  const aggregateStats = reports.reduce(
    (acc, report) => ({
      totalViews: acc.totalViews + (report.total_views || 0),
      totalTimeSeconds: acc.totalTimeSeconds + (report.total_time_seconds || 0),
      totalEmailOpens: acc.totalEmailOpens + (report.email_opens || 0),
      bestPropensity: Math.max(acc.bestPropensity, report.propensity_score || 0),
      anyHotLead: acc.anyHotLead || report.is_hot_lead,
    }),
    {
      totalViews: 0,
      totalTimeSeconds: 0,
      totalEmailOpens: 0,
      bestPropensity: 0,
      anyHotLead: false,
    }
  );

  return { 
    reports, 
    latestReport,
    aggregateStats,
    isLoading, 
    refetch,
    hasReports: reports.length > 0,
    reportCount: reports.length,
    beaconPropertySlug: property?.beacon_property_slug || null,
    isLinkedToBeacon: !!property?.beacon_property_slug,
  };
};
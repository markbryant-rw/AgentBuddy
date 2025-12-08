import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BeaconReport {
  id: string;
  appraisal_id: string;
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

export const useBeaconReports = (appraisalId: string | undefined) => {
  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['beacon_reports', appraisalId],
    queryFn: async () => {
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
    enabled: !!appraisalId,
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
  };
};
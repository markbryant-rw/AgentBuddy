import { LoggedAppraisal } from "@/hooks/useLoggedAppraisals";
import { useBeaconIntegration, REPORT_TYPE_LABELS, REPORT_TYPE_ICONS, BeaconReportType } from "@/hooks/useBeaconIntegration";
import { useBeaconReports, BeaconReport } from "@/hooks/useBeaconReports";
import { useTeam } from "@/hooks/useTeam";
import { useProperties } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ExternalLink, 
  Eye, 
  Clock, 
  Mail, 
  Activity, 
  Flame, 
  FileText,
  Send,
  Copy,
  Check,
  Sparkles,
  Lock,
  Plus,
  Pencil,
  Loader2,
  RefreshCw,
  Link2,
  CheckCircle2,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LinkBeaconReportDialog } from "./beacon/LinkBeaconReportDialog";

interface BeaconTabProps {
  appraisal: LoggedAppraisal;
  propertyId?: string; // Optional - if provided, fetches all reports for the property
}

const ReportCard = ({ 
  report, 
  isLatest,
  onCopyLink 
}: { 
  report: BeaconReport; 
  isLatest: boolean;
  onCopyLink: (url: string) => void;
}) => {
  const isDraft = !report.sent_at;
  const isSent = !!report.sent_at;
  const hasViews = report.total_views > 0;
  const isHotLead = report.is_hot_lead || report.propensity_score >= 70;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-3",
      isLatest ? "border-teal-500/50 bg-teal-500/5" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{REPORT_TYPE_ICONS[report.report_type as BeaconReportType] || '📊'}</span>
          <div>
            <p className="font-medium text-sm">
              {REPORT_TYPE_LABELS[report.report_type as BeaconReportType] || report.report_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLatest && (
            <Badge variant="secondary" className="text-[10px]">Latest</Badge>
          )}
          {isHotLead && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-[10px]">
              <Flame className="h-3 w-3" />
              Hot
            </Badge>
          )}
        </div>
      </div>

      {/* Status Pipeline - 4 steps */}
      <div className="flex items-center justify-between text-[10px]">
        {/* Draft */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center",
            "bg-teal-500/20 text-teal-600"
          )}>
            <FileText className="h-3 w-3" />
          </div>
          <span className="mt-1">Draft</span>
          <Check className="h-3 w-3 text-teal-600" />
        </div>

        <div className={cn("flex-1 h-0.5 mx-1", isSent ? "bg-teal-500" : "bg-muted")} />

        {/* Sent */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center",
            isSent ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground"
          )}>
            <Send className="h-3 w-3" />
          </div>
          <span className="mt-1">Sent</span>
          {isSent ? <Check className="h-3 w-3 text-teal-600" /> : <span className="h-3" />}
        </div>

        <div className={cn("flex-1 h-0.5 mx-1", hasViews ? "bg-teal-500" : "bg-muted")} />

        {/* Viewed */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center",
            hasViews ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground"
          )}>
            <Eye className="h-3 w-3" />
          </div>
          <span className="mt-1">Viewed</span>
          {hasViews ? (
            <span className="text-teal-600">{report.total_views}</span>
          ) : <span className="h-3" />}
        </div>

        <div className={cn("flex-1 h-0.5 mx-1", isHotLead ? "bg-red-500" : "bg-muted")} />

        {/* Hot */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center",
            isHotLead ? "bg-red-500/20 text-red-600" : "bg-muted text-muted-foreground"
          )}>
            <Flame className="h-3 w-3" />
          </div>
          <span className="mt-1">Hot</span>
          {isHotLead ? <Check className="h-3 w-3 text-red-600" /> : <span className="h-3" />}
        </div>
      </div>

      {/* Stats row */}
      {(report.total_views > 0 || report.propensity_score > 0) && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          {report.propensity_score > 0 && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Score: {report.propensity_score}%
            </span>
          )}
          {report.total_time_seconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(report.total_time_seconds)}
            </span>
          )}
          {report.email_opens > 0 && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {report.email_opens} opens
            </span>
          )}
        </div>
      )}

      {/* Actions - Simple: Edit | View | Copy */}
      <div className="flex gap-2 pt-2">
        {report.report_url && (
          <Button 
            size="sm" 
            className="flex-1 h-8 text-xs bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white" 
            asChild
          >
            <a href={report.report_url} target="_blank" rel="noopener noreferrer">
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </a>
          </Button>
        )}
        {report.personalized_url && (
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
            <a href={report.personalized_url} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3 w-3 mr-1" />
              View
            </a>
          </Button>
        )}
        {report.personalized_url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs px-2"
            onClick={() => onCopyLink(report.personalized_url!)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const BeaconTab = ({ appraisal, propertyId }: BeaconTabProps) => {
  const { 
    isBeaconEnabled, 
    createBeaconReport, 
    isCreatingReport, 
  } = useBeaconIntegration();
  const { team } = useTeam();
  const { getPropertyById } = useProperties();
  
  // Use property_id for fetching if available, otherwise fall back to appraisal_id
  const effectivePropertyId = propertyId || appraisal.property_id;
  const { 
    reports, 
    aggregateStats, 
    hasReports, 
    isLoading: reportsLoading, 
    refetch: refetchReports,
    beaconPropertySlug,
    isLinkedToBeacon,
  } = useBeaconReports(
    effectivePropertyId ? { propertyId: effectivePropertyId } : { appraisalId: appraisal.id }
  );

  // Fetch property data to get beacon_property_slug
  const [propertyData, setPropertyData] = useState<{ beacon_property_slug?: string } | null>(null);
  
  useEffect(() => {
    if (effectivePropertyId) {
      getPropertyById(effectivePropertyId).then(setPropertyData);
    }
  }, [effectivePropertyId, getPropertyById]);

  // Determine linked status from multiple sources
  // Consider property linked if: explicit beacon_property_slug exists OR we have beacon_reports records
  const propertyIsLinkedToBeacon = isLinkedToBeacon || !!beaconPropertySlug || !!propertyData?.beacon_property_slug || hasReports;
  const effectiveBeaconSlug = beaconPropertySlug || propertyData?.beacon_property_slug;

  // Fallback to appraisal.beacon_* fields if no beacon_reports records exist
  const effectiveStats = hasReports ? aggregateStats : {
    totalViews: appraisal.beacon_total_views || 0,
    totalTimeSeconds: appraisal.beacon_total_time_seconds || 0,
    totalEmailOpens: appraisal.beacon_email_opens || 0,
    bestPropensity: appraisal.beacon_propensity_score || 0,
    anyHotLead: appraisal.beacon_is_hot_lead || false,
  };
  
  const hasEngagementData = effectiveStats.bestPropensity > 0 || effectiveStats.totalViews > 0;
  const [copied, setCopied] = useState(false);
  const [isSyncingEngagement, setIsSyncingEngagement] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Vendor link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple one-click create - defaults to 'appraisal' type
  const handleCreateReport = () => {
    createBeaconReport.mutate({ appraisalId: appraisal.id, reportType: 'appraisal' });
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleSyncEngagement = async () => {
    const beaconReportId = reports[0]?.beacon_report_id || appraisal.beacon_report_id;
    
    if (!beaconReportId && !hasReports) {
      toast.error('No Beacon report linked to sync');
      return;
    }

    setIsSyncingEngagement(true);
    try {
      // Just refetch reports - engagement is synced via webhooks
      await refetchReports();
      toast.success('Engagement data refreshed');
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsSyncingEngagement(false);
    }
  };

  // Not enabled state
  if (!isBeaconEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Beacon Property Reports</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Create professional property reports and track vendor engagement in real-time.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-teal-600 mb-2" />
            <span className="font-medium">Pro Reports</span>
            <span className="text-xs text-muted-foreground">Branded PDFs</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Eye className="h-5 w-5 text-teal-600 mb-2" />
            <span className="font-medium">Track Views</span>
            <span className="text-xs text-muted-foreground">Real-time</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
            <Flame className="h-5 w-5 text-teal-600 mb-2" />
            <span className="font-medium">Hot Leads</span>
            <span className="text-xs text-muted-foreground">AI Scoring</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable Beacon in <span className="font-medium">Settings → Integrations</span>
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Property Linking Status Card */}
        <Card className={cn(
          "border",
          propertyIsLinkedToBeacon 
            ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5" 
            : "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
        )}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  propertyIsLinkedToBeacon 
                    ? "bg-emerald-500/20" 
                    : "bg-amber-500/20"
                )}>
                  {propertyIsLinkedToBeacon ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Home className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Property {propertyIsLinkedToBeacon ? 'Linked to Beacon' : 'Not Linked'}
                    {propertyIsLinkedToBeacon && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        Property-Level
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {propertyIsLinkedToBeacon 
                      ? `All reports for this property are accessible` 
                      : 'Create or link a report to enable engagement tracking'}
                  </p>
                  {effectiveBeaconSlug && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      Beacon: {effectiveBeaconSlug}
                    </p>
                  )}
                </div>
              </div>
              {hasReports && (
                <Badge variant="outline" className="text-xs">
                  {reports.length} report{reports.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Stats Card - Show when we have engagement data */}
        {hasEngagementData && (
          <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Vendor Engagement
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-xs gap-1"
                        onClick={handleSyncEngagement}
                        disabled={isSyncingEngagement}
                      >
                        {isSyncingEngagement ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh engagement data</p>
                    </TooltipContent>
                  </Tooltip>
                  {effectiveStats.anyHotLead && (
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                      <Flame className="h-3.5 w-3.5 animate-pulse" />
                      Hot Lead
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Propensity Score */}
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20">
                  <svg className="h-20 w-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/30"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="url(#propensity-gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(effectiveStats.bestPropensity / 100) * 226} 226`}
                    />
                    <defs>
                      <linearGradient id="propensity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--teal-500, 173 80% 40%))" />
                        <stop offset="100%" stopColor="hsl(var(--cyan-500, 188 80% 45%))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{effectiveStats.bestPropensity}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Propensity Score</p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveStats.bestPropensity >= 70 ? 'High likelihood to list' : 
                     effectiveStats.bestPropensity >= 40 ? 'Moderate engagement' :
                     effectiveStats.bestPropensity > 0 ? 'Early interest' : 'Awaiting engagement'}
                  </p>
                  <Progress 
                    value={effectiveStats.bestPropensity} 
                    className="h-1.5 mt-2"
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Eye className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{effectiveStats.totalViews}</span>
                  <span className="text-xs text-muted-foreground">Views</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Clock className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{formatTime(effectiveStats.totalTimeSeconds)}</span>
                  <span className="text-xs text-muted-foreground">Time</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Mail className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{effectiveStats.totalEmailOpens}</span>
                  <span className="text-xs text-muted-foreground">Opens</span>
                </div>
              </div>

              {/* Timestamps */}
              {(appraisal.beacon_first_viewed_at || appraisal.beacon_last_activity) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  {appraisal.beacon_first_viewed_at && (
                    <span>First viewed: {format(new Date(appraisal.beacon_first_viewed_at), 'MMM d, yyyy')}</span>
                  )}
                  {appraisal.beacon_last_activity && (
                    <span>Last activity: {format(new Date(appraisal.beacon_last_activity), 'MMM d, yyyy')}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Report Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">Reports</h3>
                <p className="text-sm text-muted-foreground">
                  {hasReports 
                    ? `${reports.length} report${reports.length !== 1 ? 's' : ''} created` 
                    : 'Create or link a property report to share with your vendor'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowLinkDialog(true)}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Link Existing
                </Button>
                <Button 
                  onClick={handleCreateReport}
                  disabled={isCreatingReport}
                  className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                >
                  {isCreatingReport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Beacon Report Dialog */}
        <LinkBeaconReportDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          appraisalId={appraisal.id}
          propertyId={effectivePropertyId}
          address={appraisal.address}
          teamId={team?.id || appraisal.team_id || ''}
          onSuccess={() => refetchReports()}
        />

        {/* Report History */}
        {hasReports && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Report History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading reports...
                </div>
              ) : (
                reports.map((report, index) => (
                  <ReportCard 
                    key={report.id} 
                    report={report} 
                    isLatest={index === 0}
                    onCopyLink={handleCopyLink}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state - no reports yet */}
        {!hasReports && !hasEngagementData && (
          <div className="text-center py-8 px-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-teal-600" />
            </div>
            <h4 className="font-medium mb-1">Ready to impress your vendor?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create a professional report and track when they view it.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

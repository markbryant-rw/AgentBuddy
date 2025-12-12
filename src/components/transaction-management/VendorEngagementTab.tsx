import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, 
  Plus, 
  Activity, 
  Eye, 
  Clock, 
  Mail, 
  Flame, 
  ChevronDown, 
  ChevronUp,
  Pencil,
  Copy,
  Send,
  Check,
  Sparkles,
  Lock,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { VendorReportingDialog } from '@/components/vendor-reporting/VendorReportingDialog';
import { useBeaconIntegration, REPORT_TYPE_LABELS, REPORT_TYPE_ICONS, BeaconReportType } from '@/hooks/useBeaconIntegration';
import { useBeaconReports, BeaconReport } from '@/hooks/useBeaconReports';
import { cn } from '@/lib/utils';

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

interface VendorReportWithCreator {
  id: string;
  transaction_id: string;
  team_id: string;
  created_by: string;
  property_address: string;
  vendor_name: string;
  campaign_week: number;
  buyer_feedback: string;
  desired_outcome: string;
  generated_report: any;
  created_at: string;
  updated_at: string;
  creator_name: string | null;
  vendor_report?: string;
  action_points?: string;
  whatsapp_summary?: string;
}

interface VendorEngagementTabProps {
  transactionId: string;
  propertyId?: string;
  address: string;
  suburb?: string;
  owners?: Owner[];
  teamId: string;
}

const BeaconReportCard = ({ 
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
      "border rounded-lg p-3 space-y-2",
      isLatest ? "border-teal-500/50 bg-teal-500/5" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{REPORT_TYPE_ICONS[report.report_type as BeaconReportType] || '📊'}</span>
          <div>
            <p className="font-medium text-sm">
              {REPORT_TYPE_LABELS[report.report_type as BeaconReportType] || report.report_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(report.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isLatest && (
            <Badge variant="secondary" className="text-[10px] h-5">Latest</Badge>
          )}
          {isHotLead && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-0.5 text-[10px] h-5">
              <Flame className="h-3 w-3" />
              Hot
            </Badge>
          )}
        </div>
      </div>

      {/* Mini Status Pipeline */}
      <div className="flex items-center gap-1 text-[9px]">
        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", "bg-teal-500/20 text-teal-600")}>
          <FileText className="h-2.5 w-2.5" />
        </div>
        <div className={cn("flex-1 h-0.5", isSent ? "bg-teal-500" : "bg-muted")} />
        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", isSent ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground")}>
          <Send className="h-2.5 w-2.5" />
        </div>
        <div className={cn("flex-1 h-0.5", hasViews ? "bg-teal-500" : "bg-muted")} />
        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", hasViews ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground")}>
          <Eye className="h-2.5 w-2.5" />
        </div>
        <div className={cn("flex-1 h-0.5", isHotLead ? "bg-red-500" : "bg-muted")} />
        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", isHotLead ? "bg-red-500/20 text-red-600" : "bg-muted text-muted-foreground")}>
          <Flame className="h-2.5 w-2.5" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-1">
        {report.report_url && (
          <Button size="sm" className="flex-1 h-7 text-xs bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600" asChild>
            <a href={report.report_url} target="_blank" rel="noopener noreferrer">
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </a>
          </Button>
        )}
        {report.personalized_url && (
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" asChild>
            <a href={report.personalized_url} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3 w-3 mr-1" />
              View
            </a>
          </Button>
        )}
        {report.personalized_url && (
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onCopyLink(report.personalized_url!)}>
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const VendorEngagementTab = ({ 
  transactionId, 
  propertyId, 
  address, 
  suburb, 
  owners, 
  teamId 
}: VendorEngagementTabProps) => {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<VendorReportWithCreator | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [beaconSectionOpen, setBeaconSectionOpen] = useState(true);
  const [weeklyReportsSectionOpen, setWeeklyReportsSectionOpen] = useState(true);
  const [isSyncingEngagement, setIsSyncingEngagement] = useState(false);

  // Beacon integration
  const { isBeaconEnabled, createBeaconReport, isCreatingReport } = useBeaconIntegration();
  
  // Fetch beacon reports for this property
  const { reports: beaconReports, aggregateStats, hasReports: hasBeaconReports, isLoading: beaconLoading, refetch: refetchBeacon } = useBeaconReports(
    propertyId ? { propertyId } : undefined
  );

  const hasEngagementData = aggregateStats.bestPropensity > 0 || aggregateStats.totalViews > 0;

  // Transaction data for vendor report generation
  const { data: transactionData } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('address, suburb, live_date, client_name')
        .eq('id', transactionId)
        .single();
      if (error) throw error;
      return { ...data, vendor_names: [] };
    },
  });

  // Vendor reports (weekly summaries) - table doesn't exist yet
  const { data: vendorReports, isLoading: vendorReportsLoading } = useQuery<VendorReportWithCreator[]>({
    queryKey: ['vendor-reports', transactionId],
    queryFn: async () => {
      // Return empty array until vendor_reports table is created
      return [];
    },
  });

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Vendor link copied to clipboard');
  };

  const handleCreateBeaconReport = () => {
    if (!propertyId && !address) {
      toast.error('Missing property information');
      return;
    }
    createBeaconReport.mutate({ 
      propertyId,
      reportType: 'campaign',
      address,
      suburb,
      owners,
      teamId,
    });
  };

  const handleSyncEngagement = async () => {
    setIsSyncingEngagement(true);
    try {
      await refetchBeacon();
      toast.success('Engagement data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsSyncingEngagement(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        {/* Engagement Stats Card - Always show if there's data */}
        {hasEngagementData && (
          <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Vendor Engagement
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs gap-1"
                        onClick={handleSyncEngagement}
                        disabled={isSyncingEngagement}
                      >
                        {isSyncingEngagement ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh engagement data</TooltipContent>
                  </Tooltip>
                  {aggregateStats.anyHotLead && (
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1 text-xs">
                      <Flame className="h-3 w-3 animate-pulse" />
                      Hot Lead
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Propensity Score */}
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14">
                  <svg className="h-14 w-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="url(#vendor-gradient)" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${(aggregateStats.bestPropensity / 100) * 151} 151`} />
                    <defs>
                      <linearGradient id="vendor-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(173 80% 40%)" />
                        <stop offset="100%" stopColor="hsl(188 80% 45%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{aggregateStats.bestPropensity}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Propensity Score</p>
                  <p className="text-[10px] text-muted-foreground">
                    {aggregateStats.bestPropensity >= 70 ? 'High likelihood' : 
                     aggregateStats.bestPropensity >= 40 ? 'Moderate engagement' : 'Early interest'}
                  </p>
                  <Progress value={aggregateStats.bestPropensity} className="h-1 mt-1.5" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-border/50">
                  <Eye className="h-4 w-4 text-teal-600 mb-0.5" />
                  <span className="text-lg font-bold">{aggregateStats.totalViews}</span>
                  <span className="text-[10px] text-muted-foreground">Views</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-border/50">
                  <Clock className="h-4 w-4 text-teal-600 mb-0.5" />
                  <span className="text-lg font-bold">{formatTime(aggregateStats.totalTimeSeconds)}</span>
                  <span className="text-[10px] text-muted-foreground">Time</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-border/50">
                  <Mail className="h-4 w-4 text-teal-600 mb-0.5" />
                  <span className="text-lg font-bold">{aggregateStats.totalEmailOpens}</span>
                  <span className="text-[10px] text-muted-foreground">Opens</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Beacon Reports Section */}
        <Collapsible open={beaconSectionOpen} onOpenChange={setBeaconSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    Beacon Reports
                    {hasBeaconReports && (
                      <Badge variant="secondary" className="text-xs">{beaconReports.length}</Badge>
                    )}
                  </CardTitle>
                  {beaconSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {!isBeaconEnabled ? (
                  <div className="text-center py-4">
                    <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Enable Beacon in Settings → Integrations</p>
                  </div>
                ) : (
                  <>
                    {/* Create Report Button */}
                    {(propertyId || address) && (
                      <Button 
                        onClick={handleCreateBeaconReport}
                        disabled={isCreatingReport}
                        className="w-full gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                        size="sm"
                      >
                        {isCreatingReport ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
                        ) : (
                          <><Plus className="h-4 w-4" />Create Campaign Report</>
                        )}
                      </Button>
                    )}

                    {/* Reports List */}
                    {beaconLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading reports...
                      </div>
                    ) : hasBeaconReports ? (
                      <div className="space-y-2">
                        {beaconReports.map((report, index) => (
                          <BeaconReportCard 
                            key={report.id} 
                            report={report} 
                            isLatest={index === 0}
                            onCopyLink={handleCopyLink}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No Beacon reports yet. Create one to track vendor engagement.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Weekly Vendor Reports Section */}
        <Collapsible open={weeklyReportsSectionOpen} onOpenChange={setWeeklyReportsSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Weekly Summaries
                    {vendorReports && vendorReports.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{vendorReports.length}</Badge>
                    )}
                  </CardTitle>
                  {weeklyReportsSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {/* Generate Report Button */}
                <Button 
                  onClick={() => setIsReportDialogOpen(true)} 
                  className="w-full gap-2"
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Generate Weekly Report
                </Button>

                {/* Weekly Reports List */}
                {vendorReportsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading reports...
                  </div>
                ) : vendorReports && vendorReports.length > 0 ? (
                  <div className="space-y-2">
                    {vendorReports.map((report) => (
                      <div 
                        key={report.id} 
                        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-600" />
                            <div>
                              <p className="font-medium text-sm">Week {report.campaign_week} Report</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(report.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Generate AI-powered weekly campaign reports for your vendors.
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Vendor Reporting Dialog */}
        <VendorReportingDialog
          isOpen={isReportDialogOpen}
          onClose={() => setIsReportDialogOpen(false)}
          transactionId={transactionId}
          transactionData={transactionData}
          onReportSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['vendor-reports', transactionId] });
            toast.success('Vendor report saved');
          }}
        />

        {/* Report Viewer Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Week {selectedReport?.campaign_week} Vendor Report</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              {selectedReport && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Vendor Report</h3>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {selectedReport.vendor_report}
                    </div>
                  </div>
                  
                  {selectedReport.action_points && (
                    <div>
                      <h3 className="font-semibold mb-2">Action Points</h3>
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {selectedReport.action_points}
                      </div>
                    </div>
                  )}

                  {selectedReport.whatsapp_summary && (
                    <div>
                      <h3 className="font-semibold mb-2">WhatsApp Summary</h3>
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted p-4 rounded-lg">
                        {selectedReport.whatsapp_summary}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

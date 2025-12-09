import { LoggedAppraisal } from "@/hooks/useLoggedAppraisals";
import { useBeaconIntegration, REPORT_TYPE_LABELS, REPORT_TYPE_ICONS, BeaconReportType } from "@/hooks/useBeaconIntegration";
import { useBeaconReports, BeaconReport } from "@/hooks/useBeaconReports";
import { useBeaconEngagementEvents } from "@/hooks/useBeaconEngagementEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronDown,
  Pencil,
  Link2,
  Loader2,
  Search,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BeaconTabProps {
  appraisal: LoggedAppraisal;
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

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {/* Edit - opens Beacon editor */}
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
        {/* View - opens vendor view */}
        {report.personalized_url && (
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
            <a href={report.personalized_url} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3 w-3 mr-1" />
              View
            </a>
          </Button>
        )}
        {/* Copy Link */}
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

export const BeaconTab = ({ appraisal }: BeaconTabProps) => {
  const { 
    isBeaconEnabled, 
    createBeaconReport, 
    isCreatingReport, 
    linkBeaconReport, 
    isLinkingReport,
    searchBeaconReports,
    syncTeamToBeacon,
    isSyncingTeam,
    teamId
  } = useBeaconIntegration();
  const { reports, aggregateStats, hasReports, isLoading: reportsLoading } = useBeaconReports(appraisal.id);
  const { events, isLoading: eventsLoading } = useBeaconEngagementEvents(appraisal.id);
  const [copied, setCopied] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [reportIdInput, setReportIdInput] = useState('');
  const [propertySlugInput, setPropertySlugInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [needsSync, setNeedsSync] = useState(false);

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Vendor link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateReport = (reportType: BeaconReportType) => {
    console.log('BeaconTab: handleCreateReport called with', reportType, 'appraisalId:', appraisal.id);
    createBeaconReport.mutate({ appraisalId: appraisal.id, reportType });
  };

  const handleLinkReport = () => {
    if (!reportIdInput && !propertySlugInput) {
      toast.error('Enter a Report ID or Property Slug');
      return;
    }
    
    linkBeaconReport.mutate({
      appraisalId: appraisal.id,
      reportId: reportIdInput || undefined,
      propertySlug: propertySlugInput || undefined,
    }, {
      onSuccess: () => {
        setLinkDialogOpen(false);
        setReportIdInput('');
        setPropertySlugInput('');
        setSearchResults([]);
      }
    });
  };

  const handleSearchReports = async () => {
    if (!appraisal.address) {
      toast.error('No address to search for');
      return;
    }
    
    setIsSearching(true);
    setNeedsSync(false);
    try {
      const results = await searchBeaconReports({ address: appraisal.address });
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No matching reports found');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      if (error.message?.includes('not synced')) {
        setNeedsSync(true);
        toast.error('Team not synced with Beacon. Click "Sync Team" to fix.');
      } else {
        toast.error('Could not search for reports');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSyncTeam = () => {
    if (!teamId) {
      toast.error('No team found');
      return;
    }
    syncTeamToBeacon.mutate(teamId, {
      onSuccess: () => {
        setNeedsSync(false);
        toast.success('Team synced! You can now search for reports.');
      }
    });
  };

  const handleSelectSearchResult = (result: any) => {
    setPropertySlugInput(result.property_slug || '');
    setReportIdInput(result.id || '');
    setSearchResults([]);
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

  // Not enabled - show upgrade prompt with pricing
  if (!isBeaconEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Beacon Integration</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Create professional appraisal reports and track vendor engagement in real-time.
        </p>
        <div className="mb-6 p-4 bg-muted/50 rounded-lg max-w-sm">
          <p className="font-semibold text-sm">$25/month includes 3 reports</p>
          <p className="text-xs text-muted-foreground mt-1">
            Credit packs from $2.50/report for more. Teams share credits across all members.
          </p>
        </div>
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
        <Button className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
          <Sparkles className="h-4 w-4" />
          Enable Beacon Integration
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Contact your team leader to enable this feature
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Aggregate Stats Card - Always show */}
        <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Overall Engagement
                </CardTitle>
                {aggregateStats.anyHotLead && (
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                    <Flame className="h-3.5 w-3.5 animate-pulse" />
                    Hot Lead
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Propensity Score - Large Display */}
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
                      strokeDasharray={`${(aggregateStats.bestPropensity / 100) * 226} 226`}
                    />
                    <defs>
                      <linearGradient id="propensity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--teal-500, 173 80% 40%))" />
                        <stop offset="100%" stopColor="hsl(var(--cyan-500, 188 80% 45%))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{aggregateStats.bestPropensity}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Best Propensity Score</p>
                  <p className="text-xs text-muted-foreground">
                    {aggregateStats.bestPropensity >= 70 ? 'High likelihood to list' : 
                     aggregateStats.bestPropensity >= 40 ? 'Moderate engagement' :
                     aggregateStats.bestPropensity > 0 ? 'Early interest' : 'Awaiting engagement'}
                  </p>
                  <Progress 
                    value={aggregateStats.bestPropensity} 
                    className="h-1.5 mt-2"
                  />
                </div>
              </div>

              {/* Engagement Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Eye className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{aggregateStats.totalViews}</span>
                  <span className="text-xs text-muted-foreground">Total Views</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Clock className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{formatTime(aggregateStats.totalTimeSeconds)}</span>
                  <span className="text-xs text-muted-foreground">Time Spent</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                  <Mail className="h-5 w-5 text-teal-600 mb-1" />
                  <span className="text-2xl font-bold">{aggregateStats.totalEmailOpens}</span>
                  <span className="text-xs text-muted-foreground">Email Opens</span>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Create New Report Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">Reports</h3>
                <p className="text-sm text-muted-foreground">
                  {hasReports 
                    ? `${reports.length} report${reports.length !== 1 ? 's' : ''} created` 
                    : 'Create a new report or link an existing one'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Link Existing Report */}
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Link2 className="h-4 w-4" />
                      Link Existing
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Link Existing Beacon Report</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Search by Property - Primary */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Search by Property</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Find reports matching this property address
                        </p>
                        
                        {needsSync ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                              Team not synced with Beacon. Sync to enable search.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleSyncTeam}
                              disabled={isSyncingTeam}
                              className="gap-2"
                            >
                              {isSyncingTeam ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Sync Team with Beacon
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-2 h-10"
                            onClick={handleSearchReports}
                            disabled={isSearching}
                          >
                            {isSearching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                            Search for "{appraisal.address?.substring(0, 30)}..."
                          </Button>
                        )}
                        
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="space-y-2 mt-2">
                            <p className="text-xs text-muted-foreground">Found {searchResults.length} report(s):</p>
                            {searchResults.map((result) => (
                              <button
                                key={result.id}
                                onClick={() => handleSelectSearchResult(result)}
                                className="w-full p-2 border rounded-lg text-left hover:bg-muted/50 transition-colors text-sm"
                              >
                                <p className="font-medium truncate">{result.address || result.property_slug}</p>
                                <p className="text-xs text-muted-foreground">
                                  {result.report_type} • Created {format(new Date(result.created_at), 'MMM d, yyyy')}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                        </div>
                      </div>
                      
                      {/* Property Slug */}
                      <div className="space-y-2">
                        <Label htmlFor="propertySlug" className="text-sm font-medium">Property Slug</Label>
                        <Input 
                          id="propertySlug"
                          placeholder="216b-sturges-road-henderson-auckland"
                          value={propertySlugInput}
                          onChange={(e) => {
                            setPropertySlugInput(e.target.value);
                            setReportIdInput('');
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          From URL: beacon.app/report/<span className="text-teal-600 font-semibold">property-slug</span>/view
                        </p>
                      </div>

                      {/* Report ID - Alternative */}
                      <div className="space-y-2">
                        <Label htmlFor="reportId" className="text-sm">Report ID</Label>
                        <Input 
                          id="reportId"
                          placeholder="abc123-def456-..."
                          value={reportIdInput}
                          onChange={(e) => {
                            setReportIdInput(e.target.value);
                            setPropertySlugInput('');
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          From Beacon report editor → Click "Copy ID" button
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleLinkReport}
                        disabled={isLinkingReport || (!reportIdInput && !propertySlugInput)}
                        className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600"
                      >
                        {isLinkingReport ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        Link Report
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* New Report dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      disabled={isCreatingReport}
                      className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                    >
                      {isCreatingReport ? (
                        <>Creating...</>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          New Report
                          <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCreateReport('market_appraisal')}>
                      <span className="mr-2">📊</span>
                      Market Appraisal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateReport('proposal')}>
                      <span className="mr-2">📝</span>
                      Proposal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCreateReport('update')}>
                      <span className="mr-2">🔄</span>
                      Update Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report History */}
        {hasReports && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Report History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportsLoading ? (
                <p className="text-sm text-muted-foreground">Loading reports...</p>
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

        {/* Engagement Timeline - Individual Events */}
        {hasReports && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Engagement Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <p className="text-sm text-muted-foreground">Loading events...</p>
              ) : events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/30 last:border-0">
                      <div className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center",
                        event.event_type === 'email_open' 
                          ? "bg-blue-500/20 text-blue-600"
                          : event.event_type === 'view'
                          ? "bg-teal-500/20 text-teal-600"
                          : "bg-amber-500/20 text-amber-600"
                      )}>
                        {event.event_type === 'email_open' ? (
                          <Mail className="h-3.5 w-3.5" />
                        ) : event.event_type === 'view' ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium capitalize">
                          {event.event_type === 'email_open' ? 'Email opened' : 
                           event.event_type === 'view' ? 'Report viewed' : 
                           'Link clicked'}
                        </span>
                        {event.event_type === 'view' && event.duration_seconds > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({formatTime(event.duration_seconds)})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.occurred_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No engagement events yet. Events will appear here once the vendor opens or views a report.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};
import { LoggedAppraisal } from "@/hooks/useLoggedAppraisals";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useBeaconEngagementEvents } from "@/hooks/useBeaconEngagementEvents";
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
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BeaconTabProps {
  appraisal: LoggedAppraisal;
}

export const BeaconTab = ({ appraisal }: BeaconTabProps) => {
  const { isBeaconEnabled, createBeaconReport, isCreatingReport } = useBeaconIntegration();
  const { events, isLoading: eventsLoading } = useBeaconEngagementEvents(appraisal.id);
  const [copied, setCopied] = useState(false);

  const hasReport = !!appraisal.beacon_report_id;
  const propensityScore = appraisal.beacon_propensity_score || 0;
  const totalViews = appraisal.beacon_total_views || 0;
  const totalTimeSeconds = appraisal.beacon_total_time_seconds || 0;
  const emailOpens = appraisal.beacon_email_opens || 0;
  const isHotLead = appraisal.beacon_is_hot_lead || propensityScore >= 70;
  
  // New fields for Draft/Sent status
  const reportCreatedAt = appraisal.beacon_report_created_at;
  const reportSentAt = appraisal.beacon_report_sent_at;
  const isDraft = hasReport && !reportSentAt;
  const isSent = hasReport && !!reportSentAt;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleCopyLink = async () => {
    if (appraisal.beacon_personalized_url) {
      await navigator.clipboard.writeText(appraisal.beacon_personalized_url);
      setCopied(true);
      toast.success('Vendor link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateReport = () => {
    createBeaconReport.mutate(appraisal.id);
  };

  // Not enabled - show upgrade prompt
  if (!isBeaconEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Beacon Integration</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect Beacon to create professional appraisal reports and track vendor engagement in real-time.
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

  // Enabled but no report created yet
  if (!hasReport) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-teal-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Create Beacon Report</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Generate a professional appraisal report for {appraisal.vendor_name || 'the vendor'} and track their engagement.
        </p>
        <Button 
          onClick={handleCreateReport}
          disabled={isCreatingReport}
          className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
        >
          {isCreatingReport ? (
            <>Creating Report...</>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Create Report
            </>
          )}
        </Button>
      </div>
    );
  }

  // Has report - show full analytics
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Status Overview Card */}
        <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                Vendor Engagement
              </CardTitle>
              {isHotLead && (
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
                    strokeDasharray={`${(propensityScore / 100) * 226} 226`}
                  />
                  <defs>
                    <linearGradient id="propensity-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--teal-500, 173 80% 40%))" />
                      <stop offset="100%" stopColor="hsl(var(--cyan-500, 188 80% 45%))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{propensityScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Propensity Score</p>
                <p className="text-xs text-muted-foreground">
                  {propensityScore >= 70 ? 'High likelihood to list' : 
                   propensityScore >= 40 ? 'Moderate engagement' :
                   propensityScore > 0 ? 'Early interest' : 'Awaiting engagement'}
                </p>
                <Progress 
                  value={propensityScore} 
                  className="h-1.5 mt-2"
                />
              </div>
            </div>

            {/* Engagement Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <Eye className="h-5 w-5 text-teal-600 mb-1" />
                <span className="text-2xl font-bold">{totalViews}</span>
                <span className="text-xs text-muted-foreground">Report Views</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <Clock className="h-5 w-5 text-teal-600 mb-1" />
                <span className="text-2xl font-bold">{formatTime(totalTimeSeconds)}</span>
                <span className="text-xs text-muted-foreground">Time Spent</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <Mail className="h-5 w-5 text-teal-600 mb-1" />
                <span className="text-2xl font-bold">{emailOpens}</span>
                <span className="text-xs text-muted-foreground">Email Opens</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Pipeline Status - 2 Step: Draft → Sent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Report Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {/* Draft */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-help">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center mb-2",
                      hasReport ? "bg-teal-500/20 text-teal-600" : "bg-muted text-muted-foreground"
                    )}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">Draft</span>
                    {hasReport && <Check className="h-3.5 w-3.5 text-teal-600 mt-1" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {reportCreatedAt ? (
                    <p>Created: {format(new Date(reportCreatedAt), 'MMM d, yyyy h:mm a')}</p>
                  ) : (
                    <p>Draft not yet created</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Line */}
              <div className={cn(
                "flex-1 h-0.5 mx-4",
                isSent ? "bg-teal-500" : "bg-muted"
              )} />

              {/* Sent */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-help">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center mb-2",
                      isSent 
                        ? "bg-teal-500/20 text-teal-600" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Send className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">Sent</span>
                    {isSent ? (
                      <Check className="h-3.5 w-3.5 text-teal-600 mt-1" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground mt-1">Pending</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {reportSentAt ? (
                    <p>Sent: {format(new Date(reportSentAt), 'MMM d, yyyy h:mm a')}</p>
                  ) : (
                    <p>Not yet sent to vendor</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Status badges row */}
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-border/50">
              {totalViews > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {totalViews} view{totalViews !== 1 ? 's' : ''}
                </Badge>
              )}
              {isHotLead && (
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  Hot Lead
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Timeline - Individual Events */}
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
                No engagement events yet. Events will appear here once the vendor opens or views the report.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <a href={appraisal.beacon_report_url || ''} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in Beacon
            </a>
          </Button>
          {appraisal.beacon_personalized_url && (
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Vendor Link'}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

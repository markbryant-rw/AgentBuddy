import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Eye, Clock, Mail, Activity } from "lucide-react";
import { PropensityBadge } from "./PropensityBadge";
import { format } from "date-fns";

interface BeaconEngagementPanelProps {
  beaconReportUrl?: string | null;
  beaconPersonalizedUrl?: string | null;
  propensityScore: number;
  totalViews: number;
  totalTimeSeconds: number;
  emailOpens: number;
  isHotLead: boolean;
  lastActivity?: string | null;
  firstViewedAt?: string | null;
}

export const BeaconEngagementPanel = ({
  beaconReportUrl,
  beaconPersonalizedUrl,
  propensityScore,
  totalViews,
  totalTimeSeconds,
  emailOpens,
  isHotLead,
  lastActivity,
  firstViewedAt,
}: BeaconEngagementPanelProps) => {
  // Don't show if no Beacon report exists
  if (!beaconReportUrl) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            Beacon Engagement
          </CardTitle>
          <PropensityBadge 
            score={propensityScore} 
            totalViews={totalViews} 
            isHotLead={isHotLead} 
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Propensity Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Propensity Score</span>
            <span className="font-medium">{propensityScore}/100</span>
          </div>
          <Progress 
            value={propensityScore} 
            className="h-2"
          />
        </div>

        {/* Engagement Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Eye className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{totalViews}</span>
            <span className="text-xs text-muted-foreground">Views</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{formatTime(totalTimeSeconds)}</span>
            <span className="text-xs text-muted-foreground">Time Spent</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Mail className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-semibold">{emailOpens}</span>
            <span className="text-xs text-muted-foreground">Email Opens</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {firstViewedAt && (
            <p>First viewed: {format(new Date(firstViewedAt), 'MMM d, yyyy h:mm a')}</p>
          )}
          {lastActivity && (
            <p>Last activity: {format(new Date(lastActivity), 'MMM d, yyyy h:mm a')}</p>
          )}
        </div>

        {/* Actions */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={beaconReportUrl} target="_blank" rel="noopener noreferrer">
            Open in Beacon
            <ExternalLink className="ml-2 h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

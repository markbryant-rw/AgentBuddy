import { cn } from "@/lib/utils";
import { Flame, Eye, Send, FileText, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BeaconStatusIndicatorProps {
  hasReport: boolean;
  isSent?: boolean;
  viewCount: number;
  propensityScore: number;
  isHotLead: boolean;
  compact?: boolean;
  reportCreatedAt?: string;
  reportSentAt?: string;
}

export const BeaconStatusIndicator = ({
  hasReport,
  isSent: isSentProp,
  viewCount,
  propensityScore,
  isHotLead,
  compact = false,
  reportCreatedAt,
  reportSentAt,
}: BeaconStatusIndicatorProps) => {
  // Don't render if no Beacon report
  if (!hasReport) return null;

  // Determine sent status from either prop or reportSentAt
  const isSent = isSentProp ?? !!reportSentAt;
  const isViewed = viewCount > 0;
  const showHotLead = isHotLead || propensityScore >= 70;

  if (compact) {
    // Compact version - 2-step pipeline with tooltips
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
          {/* Draft indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center",
                isSent ? "bg-teal-500/30 text-teal-600" : "bg-amber-500 text-white"
              )}>
                <FileText className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{isSent ? 'Draft' : 'Draft (not sent)'}</p>
              {reportCreatedAt && (
                <p className="text-muted-foreground">Created: {format(new Date(reportCreatedAt), 'MMM d, h:mm a')}</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-2 h-0.5", isSent ? "bg-teal-500" : "bg-muted-foreground/30")} />
          
          {/* Sent indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                isSent 
                  ? "bg-teal-500 text-white" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                <Send className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isSent ? (
                <>
                  <p className="font-medium">Sent to vendor</p>
                  {reportSentAt && (
                    <p className="text-muted-foreground">Sent: {format(new Date(reportSentAt), 'MMM d, h:mm a')}</p>
                  )}
                </>
              ) : (
                <p>Not yet sent</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          {/* View count if any */}
          {viewCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="h-5 px-1.5 py-0 text-xs gap-0.5 ml-1">
                  <Eye className="h-3 w-3" />
                  {viewCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Hot lead indicator */}
          {showHotLead && (
            <Badge variant="outline" className="h-5 px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20 gap-0.5 ml-1">
              <Flame className="h-3 w-3 animate-pulse" />
              <span className="text-[10px] font-medium">HOT</span>
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Full size indicator (for dialogs/panels)
  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {/* Draft step */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                "bg-teal-500/20 text-teal-600"
              )}>
                <FileText className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">Draft created</p>
              {reportCreatedAt && (
                <p className="text-muted-foreground">{format(new Date(reportCreatedAt), 'MMM d, yyyy h:mm a')}</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-4 h-0.5", isSent ? "bg-teal-500" : "bg-muted-foreground/30")} />
          
          {/* Sent step */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                isSent 
                  ? "bg-teal-500/20 text-teal-600" 
                  : "bg-muted text-muted-foreground"
              )}>
                <Send className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isSent ? (
                <>
                  <p className="font-medium">Sent to vendor</p>
                  {reportSentAt && (
                    <p className="text-muted-foreground">{format(new Date(reportSentAt), 'MMM d, yyyy h:mm a')}</p>
                  )}
                </>
              ) : (
                <p>Not yet sent</p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* View count badge */}
        {viewCount > 0 && (
          <Badge variant="outline" className="bg-teal-500/10 text-teal-700 border-teal-500/20 gap-1">
            <Eye className="h-3 w-3" />
            {viewCount} views
          </Badge>
        )}

        {/* Hot lead badge */}
        {showHotLead && (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <Flame className="h-3.5 w-3.5 animate-pulse" />
            Hot Lead
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
};

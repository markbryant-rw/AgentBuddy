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
  // Check if we have any meaningful engagement data worth displaying
  const hasEngagement = viewCount > 0 || propensityScore > 0 || isHotLead;
  
  // Only show indicator when there's actual engagement - hide empty/zero states
  if (!hasEngagement) return null;

  // Determine sent status from either prop or reportSentAt
  const isSent = isSentProp ?? !!reportSentAt;
  const isViewed = viewCount > 0;
  const showHotLead = isHotLead || propensityScore >= 70;
  
  // If we have engagement but no linked report, show simplified indicator
  const engagementOnly = !hasReport && hasEngagement;

  if (compact) {
    // Compact version - show simplified 2-step (Viewed → Hot) if engagement-only, else 4-step pipeline
    if (engagementOnly) {
      // Simplified indicator for engagement without linked report
      return (
        <TooltipProvider>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            {/* Viewed indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                  isViewed 
                    ? "bg-teal-500 text-white" 
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  <Eye className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isViewed ? (
                  <p className="font-medium">Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}</p>
                ) : (
                  <p>Not yet viewed</p>
                )}
              </TooltipContent>
            </Tooltip>
            
            <div className={cn("w-1.5 h-0.5", showHotLead ? "bg-orange-500" : "bg-muted-foreground/30")} />
            
            {/* Hot indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                  showHotLead 
                    ? "bg-orange-500 text-white animate-pulse" 
                    : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  <Flame className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {showHotLead ? (
                  <p className="font-medium">🔥 Hot Lead! ({propensityScore}%)</p>
                ) : (
                  <p>Propensity: {propensityScore}%</p>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      );
    }

    // Full 4-step pipeline with tooltips
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
          {/* Step 1: Draft indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-5 w-5 rounded-full flex items-center justify-center bg-teal-500/30 text-teal-600">
                <FileText className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">Draft created</p>
              {reportCreatedAt && (
                <p className="text-muted-foreground">{format(new Date(reportCreatedAt), 'MMM d, h:mm a')}</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-1.5 h-0.5", isSent ? "bg-teal-500" : "bg-muted-foreground/30")} />
          
          {/* Step 2: Sent indicator */}
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
                    <p className="text-muted-foreground">{format(new Date(reportSentAt), 'MMM d, h:mm a')}</p>
                  )}
                </>
              ) : (
                <p>Not yet sent</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-1.5 h-0.5", isViewed ? "bg-teal-500" : "bg-muted-foreground/30")} />
          
          {/* Step 3: Viewed indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                isViewed 
                  ? "bg-teal-500 text-white" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                <Eye className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isViewed ? (
                <p className="font-medium">Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}</p>
              ) : (
                <p>Not yet viewed</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-1.5 h-0.5", showHotLead ? "bg-orange-500" : "bg-muted-foreground/30")} />
          
          {/* Step 4: Hot indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                showHotLead 
                  ? "bg-orange-500 text-white animate-pulse" 
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                <Flame className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showHotLead ? (
                <p className="font-medium">🔥 Hot Lead! ({propensityScore}%)</p>
              ) : (
                <p>Not hot yet {propensityScore > 0 ? `(${propensityScore}%)` : ''}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Full size indicator (for dialogs/panels)
  if (engagementOnly) {
    // Simplified indicator for engagement without linked report
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* Viewed */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                isViewed 
                  ? "bg-teal-500/20 text-teal-600" 
                  : "bg-muted text-muted-foreground"
              )}>
                <Eye className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isViewed ? (
                <p className="font-medium">Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}</p>
              ) : (
                <p>Not yet viewed</p>
              )}
            </TooltipContent>
          </Tooltip>
          
          <div className={cn("w-3 h-0.5", showHotLead ? "bg-orange-500" : "bg-muted-foreground/30")} />
          
          {/* Hot */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                showHotLead 
                  ? "bg-orange-500/20 text-orange-600 animate-pulse" 
                  : "bg-muted text-muted-foreground"
              )}>
                <Flame className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showHotLead ? (
                <p className="font-medium">🔥 Hot Lead! ({propensityScore}%)</p>
              ) : (
                <p>Propensity: {propensityScore}%</p>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Step 1: Draft */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-teal-500/20 text-teal-600">
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
        
        <div className={cn("w-3 h-0.5", isSent ? "bg-teal-500" : "bg-muted-foreground/30")} />
        
        {/* Step 2: Sent */}
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
        
        <div className={cn("w-3 h-0.5", isViewed ? "bg-teal-500" : "bg-muted-foreground/30")} />
        
        {/* Step 3: Viewed */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
              isViewed 
                ? "bg-teal-500/20 text-teal-600" 
                : "bg-muted text-muted-foreground"
            )}>
              <Eye className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {isViewed ? (
              <p className="font-medium">Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}</p>
            ) : (
              <p>Not yet viewed</p>
            )}
          </TooltipContent>
        </Tooltip>
        
        <div className={cn("w-3 h-0.5", showHotLead ? "bg-orange-500" : "bg-muted-foreground/30")} />
        
        {/* Step 4: Hot */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
              showHotLead 
                ? "bg-orange-500/20 text-orange-600 animate-pulse" 
                : "bg-muted text-muted-foreground"
            )}>
              <Flame className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {showHotLead ? (
              <p className="font-medium">🔥 Hot Lead! ({propensityScore}%)</p>
            ) : (
              <p>Not hot yet {propensityScore > 0 ? `(${propensityScore}%)` : ''}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

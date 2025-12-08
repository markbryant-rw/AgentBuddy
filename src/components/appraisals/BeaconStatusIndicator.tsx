import { cn } from "@/lib/utils";
import { Flame, Eye, Send, FileText, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BeaconStatusIndicatorProps {
  hasReport: boolean;
  isSent: boolean;
  viewCount: number;
  propensityScore: number;
  isHotLead: boolean;
  compact?: boolean;
}

export const BeaconStatusIndicator = ({
  hasReport,
  isSent,
  viewCount,
  propensityScore,
  isHotLead,
  compact = false,
}: BeaconStatusIndicatorProps) => {
  // Don't render if no Beacon report
  if (!hasReport) return null;

  const isViewed = viewCount > 0;
  const showHotLead = isHotLead || propensityScore >= 70;

  const steps = [
    { 
      key: 'draft', 
      label: 'Draft', 
      active: hasReport, 
      icon: FileText,
      tooltip: 'Report created'
    },
    { 
      key: 'sent', 
      label: 'Sent', 
      active: isSent, 
      icon: Send,
      tooltip: 'Link shared with vendor'
    },
    { 
      key: 'opened', 
      label: viewCount > 0 ? `Opened (${viewCount})` : 'Opened', 
      active: isViewed, 
      icon: Eye,
      tooltip: isViewed ? `Viewed ${viewCount} time${viewCount !== 1 ? 's' : ''}` : 'Awaiting first view'
    },
  ];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {/* Compact progress dots */}
              <div className="flex items-center gap-0.5">
                {steps.map((step, idx) => (
                  <div key={step.key} className="flex items-center">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        step.active 
                          ? "bg-teal-500" 
                          : "bg-muted-foreground/30"
                      )}
                    />
                    {idx < steps.length - 1 && (
                      <div className={cn(
                        "w-1.5 h-0.5",
                        steps[idx + 1].active ? "bg-teal-500" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>
                ))}
              </div>
              
              {/* View count */}
              {viewCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  {viewCount}
                </span>
              )}
              
              {/* Hot lead indicator */}
              {showHotLead && (
                <Flame className="h-3 w-3 text-red-500 animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">Beacon Report Status</p>
              {steps.map(step => (
                <div key={step.key} className="flex items-center gap-2">
                  {step.active ? (
                    <Check className="h-3 w-3 text-teal-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                  )}
                  <span className={step.active ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </div>
              ))}
              {propensityScore > 0 && (
                <p className="text-muted-foreground pt-1 border-t border-border mt-1">
                  Propensity: {propensityScore}%
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full size indicator
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-full transition-colors",
                        step.active 
                          ? "bg-teal-500/20 text-teal-600" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {step.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "w-3 h-0.5",
                  steps[idx + 1].active ? "bg-teal-500" : "bg-muted-foreground/30"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* View count badge */}
      {viewCount > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {viewCount}
        </span>
      )}

      {/* Hot lead badge */}
      {showHotLead && (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
          <Flame className="h-3.5 w-3.5 animate-pulse" />
          Hot
        </span>
      )}
    </div>
  );
};
import { cn } from "@/lib/utils";
import { Flame, Eye, Send, FileText, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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
      label: viewCount > 0 ? `${viewCount}` : '0', 
      active: isViewed, 
      icon: Eye,
      tooltip: isViewed ? `Viewed ${viewCount} time${viewCount !== 1 ? 's' : ''}` : 'Awaiting first view'
    },
  ];

  if (compact) {
    // Compact version - larger, more visible inline display
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
              {/* Progress indicators */}
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full flex items-center justify-center transition-colors",
                        step.active 
                          ? "bg-teal-500 text-white" 
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={cn(
                        "w-2 h-0.5",
                        steps[idx + 1].active ? "bg-teal-500" : "bg-muted-foreground/30"
                      )} />
                    )}
                  </div>
                );
              })}
              
              {/* View count if any */}
              {viewCount > 0 && (
                <span className="text-xs font-medium text-teal-700 ml-0.5">
                  {viewCount}
                </span>
              )}
              
              {/* Hot lead indicator */}
              {showHotLead && (
                <Badge variant="outline" className="h-5 px-1.5 py-0 bg-red-500/10 text-red-600 border-red-500/20 gap-0.5 ml-1">
                  <Flame className="h-3 w-3 animate-pulse" />
                  <span className="text-[10px] font-medium">HOT</span>
                </Badge>
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
                    {step.key === 'opened' ? `Opened (${viewCount} views)` : step.label}
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

  // Full size indicator (for dialogs/panels)
  return (
    <div className="flex items-center gap-3">
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
                        "flex items-center justify-center h-8 w-8 rounded-full transition-colors",
                        step.active 
                          ? "bg-teal-500/20 text-teal-600" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {step.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5",
                  steps[idx + 1].active ? "bg-teal-500" : "bg-muted-foreground/30"
                )} />
              )}
            </div>
          );
        })}
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
  );
};
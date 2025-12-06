import { Badge } from "@/components/ui/badge";
import { Flame, ThermometerSun, ThermometerSnowflake, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PropensityBadgeProps {
  score: number;
  totalViews?: number;
  isHotLead?: boolean;
  compact?: boolean;
  showTooltip?: boolean;
}

export const PropensityBadge = ({
  score,
  totalViews = 0,
  isHotLead = false,
  compact = false,
  showTooltip = true,
}: PropensityBadgeProps) => {
  // No engagement yet
  if (score === 0 && totalViews === 0) {
    return null;
  }

  const getLevel = () => {
    if (isHotLead || score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    if (score >= 20) return 'interested';
    return 'viewed';
  };

  const level = getLevel();

  const config = {
    hot: {
      icon: Flame,
      label: 'Hot Lead',
      className: 'bg-red-500/10 text-red-700 border-red-500/20',
      iconClassName: 'text-red-500',
    },
    warm: {
      icon: ThermometerSun,
      label: 'Warm',
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      iconClassName: 'text-amber-500',
    },
    interested: {
      icon: ThermometerSnowflake,
      label: 'Interested',
      className: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      iconClassName: 'text-blue-500',
    },
    viewed: {
      icon: Eye,
      label: 'Viewed',
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      iconClassName: 'text-gray-500',
    },
  };

  const { icon: Icon, label, className, iconClassName } = config[level];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        className,
        compact && "px-1.5 py-0.5 text-xs"
      )}
    >
      <Icon className={cn("h-3 w-3", iconClassName, level === 'hot' && "animate-pulse")} />
      {!compact && (
        <>
          {label}
          {totalViews > 0 && <span className="text-xs opacity-70">({totalViews})</span>}
        </>
      )}
      {compact && totalViews > 0 && <span className="text-xs">{totalViews}</span>}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">{label}</p>
            <p>Propensity Score: {score}</p>
            {totalViews > 0 && <p>Report Views: {totalViews}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

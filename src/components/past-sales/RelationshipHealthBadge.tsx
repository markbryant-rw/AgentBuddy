import { Heart, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RelationshipHealthData } from "@/types/aftercare";

interface RelationshipHealthBadgeProps {
  healthData: RelationshipHealthData;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RelationshipHealthBadge({ 
  healthData, 
  showLabel = false,
  size = 'md' 
}: RelationshipHealthBadgeProps) {
  const { healthScore, status, completedTasks, overdueTasks, upcomingTasks } = healthData;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: Heart,
          className: 'text-emerald-500',
          bgClassName: 'bg-emerald-500/10',
          label: 'Healthy',
          pulse: true,
        };
      case 'attention':
        return {
          icon: AlertTriangle,
          className: 'text-amber-500',
          bgClassName: 'bg-amber-500/10',
          label: 'Needs Attention',
          pulse: false,
        };
      case 'at-risk':
        return {
          icon: AlertCircle,
          className: 'text-red-500',
          bgClassName: 'bg-red-500/10',
          label: 'At Risk',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1",
            config.bgClassName
          )}>
            <Icon className={cn(
              sizeClasses[size],
              config.className,
              config.pulse && "animate-pulse"
            )} />
            {showLabel && (
              <span className={cn("text-xs font-medium", config.className)}>
                {healthScore}%
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{config.label} ({healthScore}%)</p>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed • {overdueTasks} overdue • {upcomingTasks} upcoming
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

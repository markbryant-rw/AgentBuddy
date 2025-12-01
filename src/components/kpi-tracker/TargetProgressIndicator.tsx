import { CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TargetProgressIndicatorProps {
  current: number;
  target: number;
  label: string;
  kpiType: 'calls' | 'sms' | 'appraisals' | 'open_homes';
  size?: 'sm' | 'md' | 'lg';
  status?: 'on-track' | 'behind' | 'at-risk' | 'complete';
}

export const TargetProgressIndicator = ({
  current,
  target,
  label,
  size = 'md',
  status,
}: TargetProgressIndicatorProps) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);
  
  const calculatedStatus = status || (
    percentage >= 100 ? 'complete' :
    percentage >= 90 ? 'on-track' :
    percentage >= 60 ? 'behind' : 'at-risk'
  );

  const statusConfig = {
    complete: { 
      color: 'hsl(var(--chart-5))', 
      icon: CheckCircle, 
      badge: 'COMPLETE',
      bgClass: 'bg-chart-5/10'
    },
    'on-track': { 
      color: 'hsl(var(--chart-2))', 
      icon: TrendingUp, 
      badge: 'ON TRACK',
      bgClass: 'bg-chart-2/10'
    },
    behind: { 
      color: 'hsl(var(--chart-3))', 
      icon: AlertTriangle, 
      badge: 'BEHIND',
      bgClass: 'bg-chart-3/10'
    },
    'at-risk': { 
      color: 'hsl(var(--chart-1))', 
      icon: AlertTriangle, 
      badge: 'AT RISK',
      bgClass: 'bg-destructive/10'
    },
  };

  const config = statusConfig[calculatedStatus];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn("space-y-2", sizeClasses[size])}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          config.bgClass
        )}>
          <Icon className="h-3 w-3" />
          {config.badge}
        </span>
      </div>
      
      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-2"
          style={{
            // @ts-ignore - Custom CSS variable
            '--progress-background': config.color,
          }}
        />
      </div>
      
      <div className="text-sm text-muted-foreground">
        {current}/{target} ({percentage.toFixed(0)}%)
      </div>
    </div>
  );
};

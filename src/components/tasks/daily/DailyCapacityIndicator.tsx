import { Progress } from '@/components/ui/progress';
import { Clock, Zap } from 'lucide-react';

interface DailyCapacityIndicatorProps {
  totalPlannedMinutes: number;
  completedMinutes: number;
}

export function DailyCapacityIndicator({ 
  totalPlannedMinutes, 
  completedMinutes 
}: DailyCapacityIndicatorProps) {
  const availableHours = 8; // Default 8-hour workday
  const availableMinutes = availableHours * 60;
  
  const totalHours = Math.floor(totalPlannedMinutes / 60);
  const totalMinutes = totalPlannedMinutes % 60;
  
  const completedHours = Math.floor(completedMinutes / 60);
  const completedMin = completedMinutes % 60;
  
  const capacityPercentage = (totalPlannedMinutes / availableMinutes) * 100;
  const completionPercentage = totalPlannedMinutes > 0 
    ? (completedMinutes / totalPlannedMinutes) * 100 
    : 0;
  
  const isOverCapacity = totalPlannedMinutes > availableMinutes;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {totalHours}h {totalMinutes}m planned
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className={isOverCapacity ? "text-destructive font-medium" : "text-muted-foreground"}>
            {availableHours}h available
          </span>
        </div>
      </div>

      {/* Capacity Progress */}
      <div className="space-y-1">
        <Progress 
          value={Math.min(capacityPercentage, 100)} 
          className="h-2"
          indicatorClassName={isOverCapacity ? "bg-destructive" : "bg-primary"}
        />
        {isOverCapacity && (
          <p className="text-xs text-destructive">
            ⚠️ You're over capacity by {Math.floor((totalPlannedMinutes - availableMinutes) / 60)}h {(totalPlannedMinutes - availableMinutes) % 60}m
          </p>
        )}
      </div>

      {/* Completion Progress */}
      {completedMinutes > 0 && (
        <div className="space-y-1 pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completed: {completedHours}h {completedMin}m</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <Progress 
            value={completionPercentage} 
            className="h-1.5"
            indicatorClassName="bg-green-500"
          />
        </div>
      )}
    </div>
  );
}

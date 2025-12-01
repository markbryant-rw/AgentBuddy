import { motion } from 'framer-motion';
import { ClipboardCheck, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppraisalProgressHeroProps {
  actual: number;
  quarterlyTarget: number;
  weeklyTarget: number;
  thisWeekLogged: number;
  weeksIntoQuarter: number;
  totalWeeks: number;
  onViewDetails?: () => void;
}

export function AppraisalProgressHero({
  actual,
  quarterlyTarget,
  weeklyTarget,
  thisWeekLogged,
  weeksIntoQuarter,
  totalWeeks,
  onViewDetails,
}: AppraisalProgressHeroProps) {
  const percentage = (actual / quarterlyTarget) * 100;
  const expectedProgress = (weeksIntoQuarter / totalWeeks) * 100;
  const remaining = quarterlyTarget - actual;
  const weeksRemaining = totalWeeks - weeksIntoQuarter;
  const neededPerWeek = weeksRemaining > 0 ? (remaining / weeksRemaining).toFixed(1) : '0';
  
  // Determine status
  let status: 'ahead' | 'on_track' | 'behind' | 'critical';
  let statusColor: string;
  let statusIcon: React.ReactNode;
  let statusText: string;
  
  if (percentage >= expectedProgress + 10) {
    status = 'ahead';
    statusColor = 'text-green-600 dark:text-green-400';
    statusIcon = <CheckCircle className="h-5 w-5" />;
    statusText = 'Ahead of pace';
  } else if (percentage >= expectedProgress - 10) {
    status = 'on_track';
    statusColor = 'text-blue-600 dark:text-blue-400';
    statusIcon = <TrendingUp className="h-5 w-5" />;
    statusText = 'On track';
  } else if (percentage >= expectedProgress - 25) {
    status = 'behind';
    statusColor = 'text-orange-600 dark:text-orange-400';
    statusIcon = <Clock className="h-5 w-5" />;
    statusText = 'Behind pace';
  } else {
    status = 'critical';
    statusColor = 'text-red-600 dark:text-red-400';
    statusIcon = <AlertCircle className="h-5 w-5" />;
    statusText = 'Critical - needs attention';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-8 border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background scroll-mt-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            📋
          </div>
          <div>
            <h2 className="text-3xl font-bold">APPRAISALS</h2>
            <p className="text-sm text-muted-foreground">Your #1 Priority</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Week {weeksIntoQuarter} of {totalWeeks}
              </p>
            </div>
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted", statusColor)}>
              {statusIcon}
              <span className="text-sm font-medium">{statusText}</span>
            </div>
          </div>

          {/* Main Stats */}
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold">{actual}</span>
              <span className="text-2xl text-muted-foreground">/ {quarterlyTarget}</span>
              <span className="text-xl text-muted-foreground">({percentage.toFixed(0)}%)</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={percentage} 
                className="h-4"
                indicatorClassName={cn(
                  status === 'ahead' && 'bg-green-500',
                  status === 'on_track' && 'bg-blue-500',
                  status === 'behind' && 'bg-orange-500',
                  status === 'critical' && 'bg-red-500'
                )}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Should be at {Math.round(quarterlyTarget * (weeksIntoQuarter / totalWeeks))} by now</span>
                <span>{remaining} more needed</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-semibold">{thisWeekLogged} logged</p>
              <p className="text-xs text-muted-foreground">
                Target: {weeklyTarget.toFixed(1)}/week
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Needed Per Week</p>
              <p className="text-2xl font-semibold">{neededPerWeek}</p>
              <p className="text-xs text-muted-foreground">
                For remaining {weeksRemaining} weeks
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Quarterly Pace</p>
              <p className="text-2xl font-semibold">{(actual / weeksIntoQuarter).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">
                Per week average
              </p>
            </div>
          </div>

          {/* Action Button */}
          {onViewDetails && (
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={onViewDetails}
              >
                What's driving my appraisals? 
                <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

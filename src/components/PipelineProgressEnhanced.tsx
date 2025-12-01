import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Settings, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ProgressRing';
import { StackedProgressBar } from '@/components/StackedProgressBar';
import { PipelineViewSelector } from '@/components/PipelineViewSelector';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EnhancedPipelineMetric, Period } from '@/hooks/usePipelineEnhanced';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineProgressEnhancedProps {
  calls: EnhancedPipelineMetric;
  sms: EnhancedPipelineMetric;
  appraisals: EnhancedPipelineMetric;
  openHomes: EnhancedPipelineMetric;
  listings: EnhancedPipelineMetric;
  sales: EnhancedPipelineMetric;
  expectedProgress?: number;
  onAdjustTargets?: () => void;
  viewPreference: 'individual' | 'team' | 'both';
  onViewPreferenceChange: (view: 'individual' | 'team' | 'both') => void;
  hasTeam: boolean;
  isAdmin: boolean;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const MetricRow = ({
  label,
  metric,
  viewPreference,
  expectedProgress,
  isAdmin,
}: {
  label: string;
  metric: EnhancedPipelineMetric;
  viewPreference: 'individual' | 'team' | 'both';
  expectedProgress?: number;
  isAdmin: boolean;
}) => {
  // Determine what to show based on view preference and available data
  const hasIndividualGoal = metric.individual.goal > 0;
  const hasTeamGoal = metric.team.goal > 0;
  
  // If user has individual goal of 0, prefer showing team view when available
  const effectiveView = !hasIndividualGoal && hasTeamGoal ? 'team' : viewPreference;

  // Determine what to display
  const showIndividual = (effectiveView === 'individual' || effectiveView === 'both') && hasIndividualGoal;
  const showTeam = (effectiveView === 'team' || effectiveView === 'both') && hasTeamGoal;
  
  // Don't render metric at all if no goals are set anywhere
  if (!hasIndividualGoal && !hasTeamGoal) {
    return null;
  }

  const hasContributions = metric.team.contributions && metric.team.contributions.length > 0;

  return (
    <div className="space-y-4">
      {/* Individual Stats */}
      {showIndividual && metric.individual.goal > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ProgressRing progress={metric.individual.progress} size={48} strokeWidth={5} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {label}
                  {metric.individual.setByAdmin && (
                    <span className="ml-2 text-xs text-yellow-500">(Admin Set)</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {metric.individual.current}/{metric.individual.goal}
                </span>
              </div>
              <div className="relative">
                <Progress value={Math.min(metric.individual.progress, 100)} className="h-4 border-0 [&>div]:bg-transparent" />
                <div
                  className={cn(
                    'absolute top-0 left-0 h-4 rounded-full transition-all',
                    getProgressColor(metric.individual.progress)
                  )}
                  style={{ width: `${Math.min(metric.individual.progress, 100)}%` }}
                />
                {expectedProgress !== undefined && expectedProgress > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10"
                    style={{ left: `${Math.min(expectedProgress, 100)}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full" />
                  </div>
                )}
              </div>
              {metric.individual.adminNotes && (
                <p className="text-xs text-muted-foreground italic">
                  Note: {metric.individual.adminNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Stats */}
      {showTeam && metric.team.goal > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Team</span>
            <span className="text-muted-foreground">
              {metric.team.current}/{metric.team.goal}
              {expectedProgress !== undefined && (
                <span className="ml-2 text-xs">
                  (Expected: {Math.round((metric.team.goal * expectedProgress) / 100)})
                </span>
              )}
            </span>
          </div>

          {hasContributions ? (
            <StackedProgressBar
              contributions={metric.team.contributions}
              goal={metric.team.goal}
              expectedProgress={expectedProgress}
              label=""
            />
          ) : (
            <div className="relative">
              <Progress value={Math.min(metric.team.progress, 100)} className="h-4 border-0 [&>div]:bg-transparent" />
              <div
                className={cn(
                  'absolute top-0 left-0 h-4 rounded-full transition-all',
                  getProgressColor(metric.team.progress)
                )}
                style={{ width: `${Math.min(metric.team.progress, 100)}%` }}
              />
              {expectedProgress !== undefined && expectedProgress > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                  style={{ left: `${Math.min(expectedProgress, 100)}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full" />
                </div>
              )}
            </div>
          )}

          {/* Variance Warning for Admins */}
          {isAdmin && Math.abs(metric.team.variance) > 0 && (
            <Alert className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {metric.team.variance > 0
                  ? `Team needs ${metric.team.variance} more to reach goal`
                  : `Team over-committed by ${Math.abs(metric.team.variance)}`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export const PipelineProgressEnhanced = ({
  calls,
  sms,
  appraisals,
  openHomes,
  listings,
  sales,
  expectedProgress,
  onAdjustTargets,
  viewPreference,
  onViewPreferenceChange,
  hasTeam,
  isAdmin,
  period,
  onPeriodChange,
}: PipelineProgressEnhancedProps) => {
  const isLoading = calls.individual.goal === 0 && calls.team.goal === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {period === 'week' && 'Weekly Pipeline Progress'}
            {period === 'month' && 'Monthly Pipeline Progress'}
            {period === 'quarter' && 'Quarterly Pipeline Progress'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasTeam && (
              <PipelineViewSelector
                value={viewPreference}
                onChange={onViewPreferenceChange}
              />
            )}
            {onAdjustTargets && (
              <Button variant="outline" size="sm" onClick={onAdjustTargets}>
                <Settings className="h-4 w-4 mr-2" />
                {isAdmin ? 'Manage Targets' : 'Adjust Targets'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
          </TabsList>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {isLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  <MetricRow label="Calls" metric={calls} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                  <MetricRow label="SMS" metric={sms} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                  <MetricRow label="Appraisals" metric={appraisals} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                  <MetricRow label="Open Homes" metric={openHomes} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                  <MetricRow label="Listings" metric={listings} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                  <MetricRow label="Sales" metric={sales} viewPreference={viewPreference} expectedProgress={expectedProgress} isAdmin={isAdmin} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

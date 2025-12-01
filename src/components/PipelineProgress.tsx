import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ProgressRing';
import { StackedProgressBar } from '@/components/StackedProgressBar';
import type { Period, UserContribution } from '@/hooks/usePipeline';
import { startOfMonth, endOfMonth } from 'date-fns';

interface PipelineMetric {
  current: number;
  goal: number;
  progress: number;
  contributions?: UserContribution[];
}

interface PipelineProgressProps {
  calls: PipelineMetric;
  sms: PipelineMetric;
  appraisals: PipelineMetric;
  openHomes: PipelineMetric;
  listings: PipelineMetric;
  sales: PipelineMetric;
  expectedProgress?: number;
  onAdjustTargets?: () => void;
  onPeriodChange?: (period: Period) => void;
  currentPeriod: Period;
}

const calculateExpectedProgress = (period: Period): number | undefined => {
  if (period === 'week') return undefined;
  
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  
  if (period === 'month') {
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
  } else {
    // Quarter - approximate with standard quarters
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
    endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  }
  
  const totalMs = endDate.getTime() - startDate.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();
  return Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100);
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const MetricRow = ({ 
  label, 
  metric, 
  showTeamView, 
  expectedProgress 
}: { 
  label: string; 
  metric: PipelineMetric;
  showTeamView: boolean;
  expectedProgress?: number;
}) => {
  const progressColor = getProgressColor(metric.progress);
  const hasContributions = metric.contributions && metric.contributions.length > 0;
  
  return (
    <div className="space-y-3">
      {!showTeamView ? (
        // Individual view - keep ring + progress bar
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <ProgressRing progress={metric.progress} size={48} strokeWidth={5} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground">
                {metric.current}/{metric.goal}
              </span>
            </div>
            <div className="relative">
              <Progress value={Math.min(metric.progress, 100)} className="h-4 border-0 [&>div]:bg-transparent" />
              <div
                className={cn(
                  'absolute top-0 left-0 h-4 rounded-full transition-all',
                  progressColor
                )}
                style={{ width: `${Math.min(metric.progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : hasContributions ? (
        // Team view with contributions - use stacked bar
        <StackedProgressBar
          contributions={metric.contributions || []}
          goal={metric.goal}
          expectedProgress={expectedProgress}
          label={label}
        />
      ) : (
        // Team view without contributions - simple progress bar
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground">
              {metric.current}/{metric.goal}
              {expectedProgress !== undefined && (
                <span className="ml-2 text-xs">
                  (Expected: {Math.round((metric.goal * expectedProgress) / 100)})
                </span>
              )}
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(metric.progress, 100)} className="h-4 border-0 [&>div]:bg-transparent" />
            <div
              className={cn(
                'absolute top-0 left-0 h-4 rounded-full transition-all',
                progressColor
              )}
              style={{ width: `${Math.min(metric.progress, 100)}%` }}
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
        </div>
      )}
    </div>
  );
};

export const PipelineProgress = ({ 
  calls, 
  sms, 
  appraisals, 
  openHomes, 
  listings, 
  sales,
  expectedProgress,
  onAdjustTargets,
  onPeriodChange,
  currentPeriod
}: PipelineProgressProps) => {
  const handlePeriodChange = (newPeriod: string) => {
    const p = newPeriod as Period;
    onPeriodChange?.(p);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline Progress
          </CardTitle>
          {onAdjustTargets && (
            <Button variant="outline" size="sm" onClick={onAdjustTargets}>
              <Settings className="h-4 w-4 mr-2" />
              Adjust Targets
            </Button>
          )}
        </div>

        <Tabs value={currentPeriod} onValueChange={handlePeriodChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <MetricRow label="Calls" metric={calls} showTeamView={false} expectedProgress={undefined} />
            <MetricRow label="SMS" metric={sms} showTeamView={false} expectedProgress={undefined} />
            <MetricRow label="Appraisals" metric={appraisals} showTeamView={false} expectedProgress={undefined} />
            <MetricRow label="Open Homes" metric={openHomes} showTeamView={false} expectedProgress={undefined} />
            <MetricRow label="Listings" metric={listings} showTeamView={false} expectedProgress={undefined} />
            <MetricRow label="Sales" metric={sales} showTeamView={false} expectedProgress={undefined} />
          </TabsContent>

          <TabsContent value="month" className="mt-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <MetricRow label="Calls" metric={calls} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
            <MetricRow label="SMS" metric={sms} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
            <MetricRow label="Appraisals" metric={appraisals} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
            <MetricRow label="Open Homes" metric={openHomes} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
            <MetricRow label="Listings" metric={listings} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
            <MetricRow label="Sales" metric={sales} showTeamView={true} expectedProgress={calculateExpectedProgress('month')} />
          </TabsContent>

          <TabsContent value="quarter" className="mt-6 space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <MetricRow label="Calls" metric={calls} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
            <MetricRow label="SMS" metric={sms} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
            <MetricRow label="Appraisals" metric={appraisals} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
            <MetricRow label="Open Homes" metric={openHomes} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
            <MetricRow label="Listings" metric={listings} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
            <MetricRow label="Sales" metric={sales} showTeamView={true} expectedProgress={calculateExpectedProgress('quarter')} />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
};

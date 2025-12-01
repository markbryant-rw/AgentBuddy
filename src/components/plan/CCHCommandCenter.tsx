import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, Phone, ClipboardCheck, Home, ChevronDown } from 'lucide-react';
import { format, addWeeks, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { useWeeklyCCHComparison } from '@/hooks/useWeeklyCCHComparison';
import { useQuarterlyWeeks } from '@/hooks/useQuarterlyWeeks';
import { useAuth } from '@/hooks/useAuth';
import { CCHBreakdownCard } from './CCHBreakdownCard';
import { CCHExplainer } from './CCHExplainer';
import { ActionableStatus } from './ActionableStatus';
import { WeeklyOverview } from './WeeklyOverview';
import { calculateCCH } from '@/lib/cchCalculations';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { DetailedAnalytics } from './DetailedAnalytics';

interface CCHCommandCenterProps {
  weeklyTarget: number;
  quarterlyActuals: {
    calls: number;
    connections: number;
    appraisals: number;
    listings: number;
    gci: number;
  };
  quarterlyTargets: {
    calls: number;
    connections: number;
    appraisals: number;
    listings?: number;
    gci: number;
  };
  weeksIntoQuarter: number;
  totalWeeks: number;
}

export const CCHCommandCenter = ({
  weeklyTarget,
  quarterlyActuals,
  quarterlyTargets,
  weeksIntoQuarter,
  totalWeeks,
}: CCHCommandCenterProps) => {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  
  const displayDate = addWeeks(new Date(), weekOffset);
  const displayStartDate = startOfWeek(displayDate, { weekStartsOn: 1 });
  const displayEndDate = endOfWeek(displayDate, { weekStartsOn: 1 });
  
  const { data, isLoading } = useWeeklyCCHComparison(user?.id || '', displayDate);
  const { data: quarterlyWeeks, isLoading: weeksLoading } = useQuarterlyWeeks(user?.id || '', weeklyTarget);
  
  const isCurrentWeek = weekOffset === 0;
  const displayWeekNumber = getWeek(displayDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  
  if (isLoading || !data) {
    return (
      <Card className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  const { current, previous } = data;
  const progress = (current.cch / weeklyTarget) * 100;
  
  const getStatus = () => {
    if (progress >= 100) return { label: 'Target Hit!', variant: 'default' as const, color: 'text-green-500' };
    if (progress >= 85) return { label: 'On Track', variant: 'default' as const, color: 'text-green-500' };
    if (progress >= 60) return { label: 'Behind Pace', variant: 'secondary' as const, color: 'text-yellow-500' };
    return { label: 'Critical', variant: 'destructive' as const, color: 'text-red-500' };
  };
  
  const status = getStatus();
  const cchBreakdown = calculateCCH(current.calls, current.appraisals, current.openHomes);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden">
          {/* Compact Header with Navigation */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <h2 className="text-2xl font-bold">Customer Contact Hours (CCH)</h2>
                <CCHExplainer />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekOffset(w => w + 1)}
                  disabled={weekOffset >= 0}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Week {displayWeekNumber} • {format(displayStartDate, 'MMM d')} - {format(displayEndDate, 'MMM d, yyyy')}
              </div>
            </div>

            {/* Main CCH Display */}
            <div className="text-center space-y-3">
              <motion.div
                key={current.cch}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-5xl font-bold tabular-nums"
              >
                {current.cch.toFixed(1)} <span className="text-2xl text-muted-foreground">/ {weeklyTarget.toFixed(1)} hrs</span>
              </motion.div>
              
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg font-semibold">{progress.toFixed(0)}%</span>
                <Badge variant={status.variant} className="text-sm">
                  {status.label}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="max-w-2xl mx-auto">
                <Progress 
                  value={Math.min(progress, 100)} 
                  className="h-3"
                />
              </div>
            </div>
          </div>

          {/* Actionable Status */}
          {isCurrentWeek && (
            <div className="px-6 pt-4">
              <ActionableStatus
                current={current.cch}
                target={weeklyTarget}
                breakdown={current}
              />
            </div>
          )}

          {/* Breakdown Cards */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <CCHBreakdownCard
              icon={<Phone className="h-6 w-6 text-primary" />}
              label="Calls"
              value={current.calls}
              cchContribution={cchBreakdown.breakdown.callsHours}
              previousValue={previous.calls}
            />
            <CCHBreakdownCard
              icon={<ClipboardCheck className="h-6 w-6 text-primary" />}
              label="Appraisals"
              value={current.appraisals}
              cchContribution={cchBreakdown.breakdown.appraisalsHours}
              previousValue={previous.appraisals}
            />
            <CCHBreakdownCard
              icon={<Home className="h-6 w-6 text-primary" />}
              label="Open Homes"
              value={current.openHomes}
              cchContribution={cchBreakdown.breakdown.openHomesHours}
              previousValue={previous.openHomes}
            />
          </div>

          {/* 13 Week Overview */}
          {quarterlyWeeks && quarterlyWeeks.length > 0 && (
            <div className="px-6 pb-6">
              <WeeklyOverview weeks={quarterlyWeeks} isLoading={weeksLoading} />
            </div>
          )}

          {/* Time Period Tabs */}
          <div className="px-6 pb-6">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Daily view coming soon - track your CCH hour by hour
                  </p>
                </Card>
              </TabsContent>
              
              <TabsContent value="weekly" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>This Week:</strong> {current.cch.toFixed(1)} hrs of {weeklyTarget} target ({progress.toFixed(0)}%)
                  </p>
                </Card>
              </TabsContent>
              
              <TabsContent value="monthly" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Monthly aggregation coming soon - see your month at a glance
                  </p>
                </Card>
              </TabsContent>
              
              <TabsContent value="quarterly" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Quarterly Progress:</strong> Week {weeksIntoQuarter} of {totalWeeks}
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Detailed Analytics Dropdown */}
          <div className="border-t">
            <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full py-6 rounded-none border-none hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    View Detailed Analytics
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      analyticsOpen && "rotate-180"
                    )} />
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t">
                <div className="p-6">
                  <DetailedAnalytics
                    quarterlyActuals={quarterlyActuals}
                    quarterlyTargets={quarterlyTargets}
                    weeksIntoQuarter={weeksIntoQuarter}
                    totalWeeks={totalWeeks}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

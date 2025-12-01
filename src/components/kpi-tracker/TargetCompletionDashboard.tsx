import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTargetCompletionHistory } from '@/hooks/useTargetCompletionHistory';
import { CompletionSummaryCards } from './CompletionSummaryCards';
import { TargetCompletionTrendChart } from './TargetCompletionTrendChart';
import { PerKPICompletionChart } from './PerKPICompletionChart';
import { SuccessRateBarChart } from './SuccessRateBarChart';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

type Timeframe = 'last4weeks' | 'last12weeks' | 'quarter' | 'year';

export const TargetCompletionDashboard = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('last4weeks');
  const { data, loading } = useTargetCompletionHistory(timeframe);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Target History Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Create weekly targets to start tracking your completion rate over time. Historical data will appear here once you have active targets.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Target Performance Over Time
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your target completion rates and identify trends
          </p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
          <TabsList>
            <TabsTrigger value="last4weeks">4 Weeks</TabsTrigger>
            <TabsTrigger value="last12weeks">12 Weeks</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <CompletionSummaryCards data={data} />

      {/* Overall Completion Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Completion Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TargetCompletionTrendChart data={data} />
        </CardContent>
      </Card>

      {/* Per-KPI Completion Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Trends by KPI</CardTitle>
        </CardHeader>
        <CardContent>
          <PerKPICompletionChart data={data} />
        </CardContent>
      </Card>

      {/* Success Rate by KPI */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate by KPI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Percentage of weeks where target was met (≥100%)
          </p>
        </CardHeader>
        <CardContent>
          <SuccessRateBarChart data={data} />
        </CardContent>
      </Card>
    </div>
  );
};

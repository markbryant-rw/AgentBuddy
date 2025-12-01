import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KPITrendChart } from './KPITrendChart';
import { CCHTrendChart } from './CCHTrendChart';
import { useKPIHistory, type TimeframeType } from '@/hooks/useKPIHistory';
import { TrendingUp } from 'lucide-react';

export const HistoricalTrendsSection = () => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('7days');
  const { data, loading } = useKPIHistory(timeframe);

  const timeframeLabels = {
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    '90days': 'Last 90 Days',
    'quarter': 'This Quarter',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Historical Trends</h2>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeType)}>
          <TabsList>
            <TabsTrigger value="7days">7 Days</TabsTrigger>
            <TabsTrigger value="30days">30 Days</TabsTrigger>
            <TabsTrigger value="90days">90 Days</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI Activity - {timeframeLabels[timeframe]}</CardTitle>
            </CardHeader>
            <CardContent>
              <KPITrendChart data={data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CCH Trend - {timeframeLabels[timeframe]}</CardTitle>
            </CardHeader>
            <CardContent>
              <CCHTrendChart data={data} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

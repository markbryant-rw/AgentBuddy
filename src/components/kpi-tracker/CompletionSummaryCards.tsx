import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { WeeklyTargetCompletion } from '@/hooks/useTargetCompletionHistory';

interface CompletionSummaryCardsProps {
  data: WeeklyTargetCompletion[];
}

export const CompletionSummaryCards = ({ data }: CompletionSummaryCardsProps) => {
  if (data.length === 0) {
    return null;
  }

  const calculateAverage = (kpiKey: 'calls' | 'sms' | 'appraisals' | 'openHomes') => {
    const validWeeks = data.filter(w => w[kpiKey].target > 0);
    if (validWeeks.length === 0) return 0;
    return validWeeks.reduce((sum, w) => sum + w[kpiKey].percentage, 0) / validWeeks.length;
  };

  const overallAvg = data.reduce((sum, w) => sum + w.overallCompletionRate, 0) / data.length;
  const callsAvg = calculateAverage('calls');
  const appraisalsAvg = calculateAverage('appraisals');
  const homesAvg = calculateAverage('openHomes');

  const cards = [
    { label: 'Overall', value: overallAvg, color: 'from-purple-500/10 to-purple-500/5' },
    { label: 'Calls', value: callsAvg, color: 'from-blue-500/10 to-blue-500/5' },
    { label: 'Appraisals', value: appraisalsAvg, color: 'from-green-500/10 to-green-500/5' },
    { label: 'Open Homes', value: homesAvg, color: 'from-orange-500/10 to-orange-500/5' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, color }) => {
        const isGood = value >= 90;
        return (
          <Card key={label} className={`bg-gradient-to-br ${color}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <h3 className="text-3xl font-bold mt-2">{value.toFixed(0)}%</h3>
                  <p className="text-xs text-muted-foreground mt-1">Avg. Completion</p>
                </div>
                {isGood ? (
                  <TrendingUp className="h-8 w-8 text-chart-2" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-chart-3" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

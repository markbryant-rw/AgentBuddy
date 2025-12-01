import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useWeeklyReport } from '@/hooks/useWeeklyReport';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyReport() {
  const { report, isLoading } = useWeeklyReport();

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!report) {
    return null;
  }

  const { currentTotals, prevTotals, weekOverWeekChange, bestDay, daysLogged, insights } = report;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Weekly Performance Report</h3>
          <p className="text-sm text-muted-foreground">
            {format(report.weekStart, 'MMM d')} - {format(report.weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <div className="text-3xl font-bold">{currentTotals.cch.toFixed(1)} hrs</div>
          <div className="text-sm text-muted-foreground">Total CCH This Week</div>
          <div className="flex items-center gap-1 mt-2">
            {weekOverWeekChange > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">+{weekOverWeekChange.toFixed(0)}%</span>
              </>
            ) : weekOverWeekChange < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{weekOverWeekChange.toFixed(0)}%</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No change</span>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="text-3xl font-bold">{daysLogged}</div>
          <div className="text-sm text-muted-foreground">Days Logged</div>
          <div className="text-sm mt-2">
            {daysLogged >= 5 ? '✅ Great consistency!' : '⚠️ Log more days'}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="text-3xl font-bold">{bestDay.cch.toFixed(1)} hrs</div>
          <div className="text-sm text-muted-foreground">Best Day</div>
          <div className="text-sm mt-2">
            {bestDay.date ? format(new Date(bestDay.date), 'EEEE') : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Best Day Breakdown */}
      {bestDay.date && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-yellow-600" />
            <h4 className="font-semibold">Best Day Breakdown</h4>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Calls</div>
              <div className="font-semibold">{bestDay.breakdown.calls}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Appraisals</div>
              <div className="font-semibold">{bestDay.breakdown.appraisals}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Open Homes</div>
              <div className="font-semibold">{bestDay.breakdown.open_homes}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Insights</h4>
          <ul className="space-y-1">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Week Preview */}
      <div className="pt-4 border-t">
        <h4 className="font-semibold mb-2">Next Week</h4>
        <p className="text-sm text-muted-foreground">
          Keep up the momentum! Aim to maintain your consistency and push for even better results.
        </p>
      </div>
    </Card>
  );
}

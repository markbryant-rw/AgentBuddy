import { Card } from '@/components/ui/card';
import { useQuarterlyMetrics } from '@/hooks/useQuarterlyMetrics';
import { TrendingUp, Target, AlertCircle, Trophy, Calendar } from 'lucide-react';
import { getQuarter } from 'date-fns';

interface QuarterlyCommandCenterProps {
  userId: string;
  year?: number;
  quarter?: number;
}

export const QuarterlyCommandCenter = ({ userId, year, quarter }: QuarterlyCommandCenterProps) => {
  const currentYear = year || new Date().getFullYear();
  const currentQuarter = quarter || getQuarter(new Date());
  
  const { data: currentMetrics } = useQuarterlyMetrics(userId, currentYear, currentQuarter);
  const { data: previousMetrics } = useQuarterlyMetrics(
    userId, 
    currentQuarter === 1 ? currentYear - 1 : currentYear,
    currentQuarter === 1 ? 4 : currentQuarter - 1
  );

  if (!currentMetrics) return null;

  const targets = {
    appraisals: 65,
    cch: 162.5,
    listings: 26,
    sales: 13,
  };

  const weeksElapsed = Math.min(Math.floor((new Date().getDate() / 7)), 13);
  const weeksRemaining = 13 - weeksElapsed;
  
  const projectedAppraisals = currentMetrics.appraisals + (currentMetrics.appraisals / weeksElapsed) * weeksRemaining;
  const onPaceForAppraisals = projectedAppraisals >= targets.appraisals;
  const appraisalsGap = targets.appraisals - currentMetrics.appraisals;
  const appraisalsPerWeekNeeded = Math.ceil(appraisalsGap / weeksRemaining);

  const qoqGrowth = previousMetrics 
    ? ((currentMetrics.appraisals - previousMetrics.appraisals) / previousMetrics.appraisals) * 100
    : 0;

  const estimatedGCI = currentMetrics.sales * 15000; // Assume $15k per sale

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">Quarterly Command Center</h3>
            <p className="text-sm text-muted-foreground">
              Q{currentQuarter} {currentYear} • Week {weeksElapsed} of 13
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {Math.round((currentMetrics.appraisals / targets.appraisals) * 100)}%
            </span>
          </div>
        </div>

        {/* On-Pace Projection */}
        <div className={`p-4 rounded-lg ${onPaceForAppraisals ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-start gap-3">
            {onPaceForAppraisals ? (
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {onPaceForAppraisals ? 'On Pace for Target!' : 'Action Required'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {onPaceForAppraisals 
                  ? `Projected: ${Math.round(projectedAppraisals)} appraisals by quarter end`
                  : `Need ${appraisalsPerWeekNeeded} appraisals/week for remaining ${weeksRemaining} weeks`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Appraisals</p>
            <p className="text-2xl font-bold">{currentMetrics.appraisals}</p>
            <p className="text-xs text-muted-foreground">of {targets.appraisals}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CCH</p>
            <p className="text-2xl font-bold">{currentMetrics.cch.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">of {targets.cch} hrs</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Listings Won</p>
            <p className="text-2xl font-bold">{currentMetrics.listings}</p>
            <p className="text-xs text-muted-foreground">of {targets.listings}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sales</p>
            <p className="text-2xl font-bold">{currentMetrics.sales}</p>
            <p className="text-xs text-muted-foreground">of {targets.sales}</p>
          </div>
        </div>

        {/* Financial Outlook */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4" />
            <span className="text-sm font-semibold">Financial Outlook</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current GCI</span>
              <span className="font-semibold">${estimatedGCI.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projected GCI</span>
              <span className="font-semibold">${(estimatedGCI * (targets.sales / currentMetrics.sales)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Quarter over Quarter */}
        {previousMetrics && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">vs. Last Quarter</span>
            <div className="flex items-center gap-1">
              {qoqGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span className={qoqGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(qoqGrowth).toFixed(1)}% {qoqGrowth >= 0 ? 'growth' : 'decline'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

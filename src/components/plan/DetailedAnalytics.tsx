import { WeeklyBreakdownGrid } from './WeeklyBreakdownGrid';
import { ConversionFunnel } from './ConversionFunnel';
import { PaceScenarios } from './PaceScenarios';

interface DetailedAnalyticsProps {
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

export const DetailedAnalytics = ({
  quarterlyActuals,
  quarterlyTargets,
  weeksIntoQuarter,
  totalWeeks,
}: DetailedAnalyticsProps) => {
  const weeksRemaining = totalWeeks - weeksIntoQuarter;

  return (
    <div className="space-y-6">
      <WeeklyBreakdownGrid
        weeksIntoQuarter={weeksIntoQuarter}
        totalWeeks={totalWeeks}
      />

      <ConversionFunnel
        actuals={{
          calls: quarterlyActuals.calls,
          connections: quarterlyActuals.connections,
          appraisals: quarterlyActuals.appraisals,
          listings: quarterlyActuals.listings,
        }}
        targets={{
          calls: quarterlyTargets.calls,
          connections: quarterlyTargets.connections,
          appraisals: quarterlyTargets.appraisals,
          listings: quarterlyTargets.listings,
        }}
      />

      <PaceScenarios
        currentPace={{
          appraisals: quarterlyActuals.appraisals,
          gci: quarterlyActuals.gci,
        }}
        targets={{
          appraisals: quarterlyTargets.appraisals,
          gci: quarterlyTargets.gci,
        }}
        weeksIntoQuarter={weeksIntoQuarter}
        weeksRemaining={weeksRemaining}
      />
    </div>
  );
};

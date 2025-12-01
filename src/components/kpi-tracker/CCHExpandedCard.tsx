import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { TrendIndicator } from '@/components/TrendIndicator';
import type { CCHData } from '@/hooks/useKPITrackerData';

interface CCHExpandedCardProps {
  cch: CCHData;
  averageDailyCCH?: number;
}

export const CCHExpandedCard = ({ cch, averageDailyCCH = 0 }: CCHExpandedCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Customer Contact Hours</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Daily CCH */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <TrendIndicator
                currentValue={cch.daily}
                targetValue={cch.dailyTarget}
                averageValue={averageDailyCCH}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">TODAY</p>
                <p className="text-4xl font-bold">{cch.daily.toFixed(1)} hrs</p>
                <p className="text-xs text-muted-foreground">Target: {cch.dailyTarget.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly CCH */}
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <ProgressRing 
                progress={cch.weeklyTarget > 0 ? (cch.weekly / cch.weeklyTarget) * 100 : 0}
                size={80} 
                strokeWidth={10}
                hidePercentage={false}
                hideBackgroundRing={false}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">THIS WEEK</p>
                <p className="text-4xl font-bold">{cch.weekly.toFixed(1)} hrs</p>
                <p className="text-xs text-muted-foreground">Target: {cch.weeklyTarget.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Toggle */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-2" />
            Hide Breakdown
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            View Detailed Breakdown
          </>
        )}
      </Button>

      {expanded && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Daily Breakdown</h3>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Calls ({cch.breakdown.calls})</span>
                  <span className="font-medium">{(cch.breakdown.calls / 20).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Appraisals ({cch.breakdown.appraisals})</span>
                  <span className="font-medium">{(cch.breakdown.appraisals * 1).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Open Homes ({cch.breakdown.openHomes})</span>
                  <span className="font-medium">{(cch.breakdown.openHomes / 2).toFixed(2)} hrs</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Weekly Breakdown</h3>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Calls ({cch.weeklyBreakdown.calls})</span>
                    <span className="font-medium">{(cch.weeklyBreakdown.calls / 20).toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Appraisals ({cch.weeklyBreakdown.appraisals})</span>
                    <span className="font-medium">{(cch.weeklyBreakdown.appraisals * 1).toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Open Homes ({cch.weeklyBreakdown.openHomes})</span>
                    <span className="font-medium">{(cch.weeklyBreakdown.openHomes / 2).toFixed(2)} hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

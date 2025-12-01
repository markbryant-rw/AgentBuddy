import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PaceScenariosProps {
  currentPace: {
    appraisals: number;
    gci: number;
  };
  targets: {
    appraisals: number;
    gci: number;
  };
  weeksIntoQuarter: number;
  weeksRemaining: number;
}

export const PaceScenarios = ({
  currentPace,
  targets,
  weeksIntoQuarter,
  weeksRemaining,
}: PaceScenariosProps) => {
  // Calculate scenarios
  const currentWeeklyRate = currentPace.appraisals / weeksIntoQuarter;
  const requiredWeeklyRate = (targets.appraisals - currentPace.appraisals) / weeksRemaining;
  const stretchWeeklyRate = requiredWeeklyRate * 1.2;

  const scenarios = [
    {
      title: 'Current Pace',
      description: 'If you maintain current pace',
      weeklyRate: currentWeeklyRate,
      projectedAppraisals: Math.round(currentPace.appraisals + (currentWeeklyRate * weeksRemaining)),
      projectedGci: Math.round(currentPace.gci + ((currentPace.gci / currentPace.appraisals) * currentWeeklyRate * weeksRemaining)),
      status: 'current',
    },
    {
      title: 'Required Pace',
      description: 'If you hit required pace',
      weeklyRate: requiredWeeklyRate,
      projectedAppraisals: targets.appraisals,
      projectedGci: targets.gci,
      status: 'required',
    },
    {
      title: 'Stretch Goal',
      description: 'If you increase to stretch',
      weeklyRate: stretchWeeklyRate,
      projectedAppraisals: Math.round(currentPace.appraisals + (stretchWeeklyRate * weeksRemaining)),
      projectedGci: Math.round(targets.gci * 1.1),
      status: 'stretch',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'border-orange-500 bg-orange-500/10';
      case 'required': return 'border-green-500 bg-green-500/10';
      case 'stretch': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-border';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pace Scenarios</CardTitle>
        <CardDescription>Project your quarter-end results based on different paces</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const gapFromTarget = scenario.projectedGci - targets.gci;
            const appraisalGap = scenario.projectedAppraisals - targets.appraisals;

            return (
              <div
                key={scenario.status}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  getStatusColor(scenario.status)
                )}
              >
                <h4 className="font-bold mb-1">{scenario.title}</h4>
                <p className="text-xs text-muted-foreground mb-3">{scenario.description}</p>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Weekly rate:</span>
                    <span className="font-bold ml-2">{scenario.weeklyRate.toFixed(1)}/week</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Projected appraisals:</span>
                    <span className="font-bold ml-2">{scenario.projectedAppraisals}</span>
                    {appraisalGap !== 0 && (
                      <span className={cn(
                        'text-xs ml-1',
                        appraisalGap > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        ({appraisalGap > 0 ? '+' : ''}{appraisalGap})
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Projected GCI:</span>
                    <span className="font-bold ml-2">${(scenario.projectedGci / 1000).toFixed(0)}K</span>
                    {gapFromTarget !== 0 && (
                      <span className={cn(
                        'text-xs ml-1',
                        gapFromTarget > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        ({gapFromTarget > 0 ? '+' : ''}${(gapFromTarget / 1000).toFixed(0)}K)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

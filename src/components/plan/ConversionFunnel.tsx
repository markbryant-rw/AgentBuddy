import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConversionFunnelProps {
  actuals: {
    calls: number;
    connections: number;
    appraisals: number;
    listings: number;
  };
  targets: {
    calls: number;
    connections: number;
    appraisals: number;
    listings?: number;
  };
}

export const ConversionFunnel = ({ actuals, targets }: ConversionFunnelProps) => {
  const stages = [
    {
      name: 'Calls',
      actual: actuals.calls,
      target: targets.calls,
      nextRate: actuals.connections / actuals.calls || 0,
      targetRate: targets.connections / targets.calls,
    },
    {
      name: 'Connections',
      actual: actuals.connections,
      target: targets.connections,
      nextRate: actuals.appraisals / actuals.connections || 0,
      targetRate: targets.appraisals / targets.connections,
    },
    {
      name: 'Appraisals',
      actual: actuals.appraisals,
      target: targets.appraisals,
      nextRate: actuals.listings / actuals.appraisals || 0,
      targetRate: (targets.listings || 3) / targets.appraisals,
    },
    {
      name: 'Listings',
      actual: actuals.listings,
      target: targets.listings || 3,
      nextRate: 0,
      targetRate: 0,
    },
  ];

  const getStageStatus = (actual: number, target: number) => {
    const percentage = (actual / target) * 100;
    if (percentage >= 90) return 'on-track';
    if (percentage >= 50) return 'behind';
    return 'critical';
  };

  const bottleneckIndex = stages.findIndex(stage => 
    getStageStatus(stage.actual, stage.target) === 'critical'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Track your activity pipeline performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.actual, stage.target);
            const isBottleneck = index === bottleneckIndex;
            const percentage = (stage.actual / stage.target) * 100;

            return (
              <div key={stage.name}>
                <div
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    status === 'critical' && 'border-red-500 bg-red-500/10',
                    status === 'behind' && 'border-orange-500 bg-orange-500/10',
                    status === 'on-track' && 'border-green-500 bg-green-500/10',
                    isBottleneck && 'ring-2 ring-red-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{stage.name}</span>
                    <span className="text-sm font-mono">
                      {stage.actual} / {stage.target}
                      <span className="text-muted-foreground ml-2">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  
                  {index < stages.length - 1 && (
                    <div className="text-xs text-muted-foreground">
                      Conversion: {(stage.nextRate * 100).toFixed(1)}% 
                      <span className="ml-1">(Target: {(stage.targetRate * 100).toFixed(1)}%)</span>
                    </div>
                  )}
                </div>
                
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="text-2xl text-muted-foreground">↓</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {bottleneckIndex >= 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              🚨 Bottleneck: {stages[bottleneckIndex].name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This stage is significantly behind target and blocking your funnel
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

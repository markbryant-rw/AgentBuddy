import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import type { PersonalKPIData } from '@/hooks/useKPITrackerData';
import { TargetProgressIndicator } from './TargetProgressIndicator';

interface PersonalKPISectionProps {
  kpis: PersonalKPIData;
}

export const PersonalKPISection = ({ kpis }: PersonalKPISectionProps) => {
  const kpiConfig = [
    { key: 'calls' as const, label: 'Calls', color: 'from-blue-500/10 to-blue-500/5', kpiType: 'calls' as const },
    { key: 'sms' as const, label: 'SMS', color: 'from-green-500/10 to-green-500/5', kpiType: 'sms' as const },
    { key: 'appraisals' as const, label: 'Appraisals', color: 'from-purple-500/10 to-purple-500/5', kpiType: 'appraisals' as const },
    { key: 'openHomes' as const, label: 'Open Homes', color: 'from-orange-500/10 to-orange-500/5', kpiType: 'open_homes' as const },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Performance</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map(({ key, label, color, kpiType }) => {
          const kpi = kpis[key];

          return (
            <Card key={key} className={`bg-gradient-to-br ${color}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold">{kpi.today}</div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <span className="text-muted-foreground">Today's activity</span>
                  </div>

                  <div className="flex items-center text-sm">
                    <span className="font-medium">{kpi.week}</span>
                    <span className="text-muted-foreground ml-1">this week</span>
                  </div>
                </div>

                {kpi.goal > 0 && (
                  <div className="pt-2 border-t">
                    <TargetProgressIndicator
                      current={kpi.week}
                      target={kpi.goal}
                      label="Weekly Target"
                      kpiType={kpiType}
                      size="sm"
                      status={kpi.targetStatus}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

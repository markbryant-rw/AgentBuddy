import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingDown, Target, Calendar } from 'lucide-react';
import { useCCH } from '@/hooks/useCCH';
import { useQuarterlyMetrics } from '@/hooks/useQuarterlyMetrics';
import { getDay } from 'date-fns';

interface SmartAlertsProps {
  userId: string;
  onSetGoals?: () => void;
}

export const SmartAlerts = ({ userId, onSetGoals }: SmartAlertsProps) => {
  const { weeklyCCH, weeklyCCHTarget, paceMetrics } = useCCH();
  const { data: quarterlyMetrics } = useQuarterlyMetrics(userId);

  const alerts = [];
  const today = getDay(new Date());
  const isFriday = today === 5;

  // Behind pace alert
  if (paceMetrics?.status === 'behind') {
    alerts.push({
      type: 'warning',
      icon: TrendingDown,
      title: 'Behind Weekly Pace',
      message: `Need ${paceMetrics.requiredPerDay.toFixed(1)} hrs/day to hit weekly target`,
      action: 'Focus on high-impact activities',
    });
  }

  // Friday catch-up alert
  if (isFriday && weeklyCCH < weeklyCCHTarget * 0.8) {
    alerts.push({
      type: 'urgent',
      icon: AlertCircle,
      title: 'Friday Catch-Up Needed',
      message: `${(weeklyCCHTarget - weeklyCCH).toFixed(1)} hrs needed to hit weekly target`,
      action: 'Schedule calls and appraisals today',
    });
  }

  // Quarterly pace alert
  if (quarterlyMetrics) {
    const weeksElapsed = Math.floor((new Date().getDate() / 7));
    const expectedAppraisals = (65 / 13) * weeksElapsed;
    
    if (quarterlyMetrics.appraisals < expectedAppraisals * 0.85) {
      alerts.push({
        type: 'info',
        icon: Target,
        title: 'Quarterly Appraisals Tracking',
        message: `${Math.ceil(expectedAppraisals - quarterlyMetrics.appraisals)} appraisals behind quarterly pace`,
        action: 'Book more appraisal appointments',
      });
    }
  }

  // Week-end review prompt
  if (isFriday) {
    alerts.push({
      type: 'info',
      icon: Calendar,
      title: 'Week-End Review',
      message: 'Time to review this week\'s performance',
      action: 'Complete your weekly reflection',
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Smart Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          const colorClass =
            alert.type === 'urgent' ? 'text-red-500 bg-red-500/10' :
            alert.type === 'warning' ? 'text-yellow-500 bg-yellow-500/10' :
            'text-blue-500 bg-blue-500/10';

          return (
            <div
              key={alert.title}
              className={`p-4 rounded-lg border-2 ${
                alert.type === 'urgent' ? 'border-red-500/20' :
                alert.type === 'warning' ? 'border-yellow-500/20' :
                'border-blue-500/20'
              }`}
            >
              <div className="flex gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-primary mt-2 font-medium">→ {alert.action}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

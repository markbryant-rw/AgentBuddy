import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamQuarterlyAppraisals } from '@/hooks/useTeamQuarterlyAppraisals';
import { useTeamWeeklyCCH } from '@/hooks/useTeamWeeklyCCH';
import { useTeamCCHTarget } from '@/hooks/useTeamCCHTarget';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getQuarter, endOfQuarter, differenceInDays } from 'date-fns';

export const PlanHeroMetrics = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { data: quarterlyAppraisals } = useTeamQuarterlyAppraisals(team?.id);
  const { data: weeklyCCHData } = useTeamWeeklyCCH(team?.id);
  const { data: cchTargetData } = useTeamCCHTarget(team?.id);

  // Calculate quarterly appraisals target (13 weeks * weekly target)
  const quarterlyAppraisalsTarget = 65; // Team quarterly target - TODO: fetch from team goals
  const appraisalsProgress = quarterlyAppraisals?.total || 0;
  const appraisalsPercentage = Math.min(100, (appraisalsProgress / quarterlyAppraisalsTarget) * 100);
  
  const currentQuarter = getQuarter(new Date());
  const quarterEndDate = endOfQuarter(new Date());
  const daysRemainingInQuarter = differenceInDays(quarterEndDate, new Date());

  // Calculate appraisals status
  const expectedAppraisalsByNow = (quarterlyAppraisalsTarget / 91) * (91 - daysRemainingInQuarter);
  const appraisalsStatus = 
    appraisalsProgress >= expectedAppraisalsByNow * 1.1 ? 'ahead' :
    appraisalsProgress >= expectedAppraisalsByNow * 0.85 ? 'ontrack' : 
    appraisalsProgress >= expectedAppraisalsByNow * 0.6 ? 'behind' : 'critical';

  // Calculate CCH metrics
  const weeklyCCH = weeklyCCHData?.cch || 0;
  const weeklyCCHTarget = cchTargetData?.weeklyCCHTarget || 0;
  const cchPercentage = weeklyCCHTarget > 0 ? Math.min(100, (weeklyCCH / weeklyCCHTarget) * 100) : 0;
  const cchStatus = 
    weeklyCCH >= weeklyCCHTarget * 0.9 ? 'ontrack' :
    weeklyCCH >= weeklyCCHTarget * 0.7 ? 'behind' : 'critical';

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ahead':
        return { 
          color: 'text-green-600 dark:text-green-400', 
          bg: 'bg-green-50 dark:bg-green-950/30',
          icon: TrendingUp,
          label: 'Ahead of Pace'
        };
      case 'ontrack':
        return { 
          color: 'text-blue-600 dark:text-blue-400', 
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          icon: CheckCircle2,
          label: 'On Track'
        };
      case 'behind':
        return { 
          color: 'text-amber-600 dark:text-amber-400', 
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          icon: AlertTriangle,
          label: 'Behind Pace'
        };
      case 'critical':
        return { 
          color: 'text-red-600 dark:text-red-400', 
          bg: 'bg-red-50 dark:bg-red-950/30',
          icon: AlertTriangle,
          label: 'Critical'
        };
      default:
        return { 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          icon: Target,
          label: 'Unknown'
        };
    }
  };

  const appraisalsStatusConfig = getStatusConfig(appraisalsStatus);
  const cchStatusConfig = getStatusConfig(cchStatus);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Appraisals Progress */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Team Appraisals This Quarter</h3>
              <p className="text-sm text-muted-foreground">Q{currentQuarter} {new Date().getFullYear()}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${appraisalsStatusConfig.bg}`}>
              <appraisalsStatusConfig.icon className={`h-4 w-4 ${appraisalsStatusConfig.color}`} />
              <span className={`text-xs font-medium ${appraisalsStatusConfig.color}`}>
                {appraisalsStatusConfig.label}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{appraisalsProgress}</span>
                  <span className="text-muted-foreground">/ {quarterlyAppraisalsTarget}</span>
                </div>
                <span className="text-sm font-medium">{appraisalsPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={appraisalsPercentage} className="h-3" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Days remaining in quarter</span>
              <span className="font-medium">{daysRemainingInQuarter}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CCH Performance */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Team CCH This Week</h3>
              <p className="text-sm text-muted-foreground">Team Customer Contact Hours</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cchStatusConfig.bg}`}>
              <cchStatusConfig.icon className={`h-4 w-4 ${cchStatusConfig.color}`} />
              <span className={`text-xs font-medium ${cchStatusConfig.color}`}>
                {cchStatusConfig.label}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{weeklyCCH.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ {weeklyCCHTarget.toFixed(1)} hrs</span>
                </div>
                <span className="text-sm font-medium">{cchPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={cchPercentage} className="h-3" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Average daily CCH</span>
              <span className="font-medium">{(weeklyCCH / 5).toFixed(1)} hrs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

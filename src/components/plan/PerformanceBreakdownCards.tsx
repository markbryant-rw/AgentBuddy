import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Phone, ClipboardCheck, Home, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreakdownCardProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  trend?: number;
  color: string;
}

const BreakdownCard = ({ icon, label, current, target, trend, color }: BreakdownCardProps) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const status = percentage >= 100 ? 'exceeded' : percentage >= 70 ? 'on-track' : 'behind';

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', `bg-${color}-100 dark:bg-${color}-900/30`)}>
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">
              {current} <span className="text-sm text-muted-foreground">/ {target}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'font-semibold',
            status === 'exceeded' && 'text-green-600',
            status === 'on-track' && 'text-blue-600',
            status === 'behind' && 'text-orange-600'
          )}>
            {percentage.toFixed(0)}%
          </span>
          {trend !== undefined && (
            <span className={cn(
              'flex items-center gap-1',
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)} vs LW
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

interface PerformanceBreakdownCardsProps {
  breakdown: {
    calls: { current: number; target: number; trend?: number };
    appraisals: { current: number; target: number; trend?: number };
    openHomes: { current: number; target: number; trend?: number };
  };
}

export function PerformanceBreakdownCards({ breakdown }: PerformanceBreakdownCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <BreakdownCard
        icon={<Phone className="h-5 w-5 text-blue-600" />}
        label="Calls"
        current={breakdown.calls.current}
        target={breakdown.calls.target}
        trend={breakdown.calls.trend}
        color="blue"
      />
      <BreakdownCard
        icon={<ClipboardCheck className="h-5 w-5 text-purple-600" />}
        label="Appraisals"
        current={breakdown.appraisals.current}
        target={breakdown.appraisals.target}
        trend={breakdown.appraisals.trend}
        color="purple"
      />
      <BreakdownCard
        icon={<Home className="h-5 w-5 text-green-600" />}
        label="Open Homes"
        current={breakdown.openHomes.current}
        target={breakdown.openHomes.target}
        trend={breakdown.openHomes.trend}
        color="green"
      />
    </div>
  );
}

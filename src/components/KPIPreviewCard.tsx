import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPIPreviewCardProps {
  kpiType: string;
  todayValue: number;
  dailyChange: { diff: number; isGain: boolean };
}

export const KPIPreviewCard = ({ kpiType, todayValue, dailyChange }: KPIPreviewCardProps) => {
  const formatKPIName = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {formatKPIName(kpiType)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{todayValue}</div>
        <div className="flex items-center text-sm mt-1">
          {dailyChange.isGain ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-500 mr-1" />
          )}
          <span className={dailyChange.isGain ? 'text-green-500' : 'text-orange-500'}>
            {dailyChange.isGain ? '+' : '-'}{dailyChange.diff}
          </span>
          <span className="text-muted-foreground ml-1">today</span>
        </div>
      </CardContent>
    </Card>
  );
};

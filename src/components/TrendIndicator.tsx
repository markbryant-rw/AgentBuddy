import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  currentValue: number;
  targetValue: number;
  averageValue: number;
}

export const TrendIndicator = ({ currentValue, targetValue, averageValue }: TrendIndicatorProps) => {
  // Calculate trend percentage against average
  const trendPercentage = averageValue > 0 
    ? ((currentValue - averageValue) / averageValue) * 100 
    : 0;
  
  // Determine trend status
  const getTrendStatus = () => {
    if (trendPercentage > 5) return 'up';
    if (trendPercentage < -5) return 'down';
    return 'neutral';
  };

  const status = getTrendStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'up':
        return {
          icon: TrendingUp,
          color: 'text-chart-2',
          bgColor: 'bg-chart-2/10',
          text: 'Above average',
          sign: '+'
        };
      case 'down':
        return {
          icon: TrendingDown,
          color: 'text-chart-1',
          bgColor: 'bg-chart-1/10',
          text: 'Below average',
          sign: ''
        };
      default:
        return {
          icon: Minus,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          text: 'On track',
          sign: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-8 h-8 ${config.color}`} strokeWidth={2.5} />
      <div>
        <p className={`text-3xl font-bold ${config.color}`}>
          {config.sign}{Math.abs(trendPercentage).toFixed(0)}%
        </p>
        <p className="text-xs text-muted-foreground">{config.text}</p>
      </div>
    </div>
  );
};

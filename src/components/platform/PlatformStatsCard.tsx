import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface PlatformStatsCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: LucideIcon;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const PlatformStatsCard = ({ title, value, change, icon: Icon, subtitle, onClick, className }: PlatformStatsCardProps) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return change > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-muted-foreground';
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <Card 
      className={onClick ? `cursor-pointer hover:shadow-lg transition-shadow ${className || ''}` : className}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs mt-1">
            {getTrendIcon()}
            <span className={`ml-1 ${getTrendColor()}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-muted-foreground ml-1">from last 30 days</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

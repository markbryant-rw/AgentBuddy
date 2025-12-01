import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CCHBreakdownCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  cchContribution: number;
  previousValue?: number;
  unit?: string;
}

export const CCHBreakdownCard = ({
  icon,
  label,
  value,
  cchContribution,
  previousValue,
  unit = '',
}: CCHBreakdownCardProps) => {
  const change = previousValue !== undefined ? value - previousValue : 0;
  const changePercent = previousValue && previousValue > 0 ? ((change / previousValue) * 100) : 0;
  
  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };
  
  const getTrendColor = () => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative p-4 space-y-3">
          {/* Icon */}
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          
          {/* Metric */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <motion.div 
              className="text-3xl font-bold tabular-nums"
              key={value}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {value}{unit}
            </motion.div>
            <div className="text-sm text-muted-foreground">
              {cchContribution.toFixed(1)} hrs CCH
            </div>
          </div>
          
          {/* Trend indicator */}
          {previousValue !== undefined && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span className="font-medium">
                {change > 0 ? '+' : ''}{change}{unit}
              </span>
              {changePercent !== 0 && (
                <span className="text-muted-foreground">
                  ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(0)}%)
                </span>
              )}
              <span className="text-muted-foreground ml-1">vs last week</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

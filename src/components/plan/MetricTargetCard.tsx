import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Phone, Home, Calendar, TrendingUp } from 'lucide-react';
import { KPI_COLORS } from '@/lib/kpiColors';

interface MetricTargetCardProps {
  type: 'calls' | 'appraisals' | 'openHomes' | 'cch';
  actual: number;
  target: number;
  onClick?: () => void;
}

const METRIC_CONFIG = {
  calls: {
    label: 'Calls',
    icon: Phone,
    color: KPI_COLORS.calls,
  },
  appraisals: {
    label: 'Appraisals',
    icon: Calendar,
    color: KPI_COLORS.appraisals,
  },
  openHomes: {
    label: 'Open Homes',
    icon: Home,
    color: KPI_COLORS.openHomes,
  },
  cch: {
    label: 'CCH Total',
    icon: TrendingUp,
    color: KPI_COLORS.cch,
  },
};

export function MetricTargetCard({ type, actual, target, onClick }: MetricTargetCardProps) {
  const config = METRIC_CONFIG[type];
  const Icon = config.icon;
  const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const remaining = Math.max(0, target - actual);
  const isComplete = actual >= target;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: config.color.light }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color: config.color.primary }}
              />
            </div>
            {isComplete && (
              <Badge variant="default" className="bg-green-100 text-green-700">
                Complete ✓
              </Badge>
            )}
          </div>

          {/* Title */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              {config.label}
            </h4>
          </div>

          {/* Numbers */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-bold"
                style={{ color: config.color.primary }}
              >
                {actual}
              </span>
              <span className="text-sm text-muted-foreground">
                of {target}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <Progress
            value={percentage}
            className="h-2"
            indicatorClassName="transition-all"
            style={{
              '--progress-color': config.color.primary,
            } as React.CSSProperties}
          />

          {/* Status Text */}
          <div className="text-xs font-medium" style={{ color: config.color.dark }}>
            {isComplete ? (
              <span>Target achieved! 🎉</span>
            ) : (
              <span>{remaining} more to go</span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

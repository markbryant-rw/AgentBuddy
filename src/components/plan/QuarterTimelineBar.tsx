import { motion } from 'framer-motion';
import { differenceInDays, startOfQuarter, endOfQuarter } from 'date-fns';
import { KPI_COLORS } from '@/lib/kpiColors';

export function QuarterTimelineBar() {
  const now = new Date();
  const quarterStart = startOfQuarter(now);
  const quarterEnd = endOfQuarter(now);
  const totalDays = differenceInDays(quarterEnd, quarterStart) + 1;
  const daysElapsed = differenceInDays(now, quarterStart) + 1;
  const daysRemaining = totalDays - daysElapsed;
  const progressPercentage = (daysElapsed / totalDays) * 100;

  // Get month names for this quarter
  const months = [];
  const currentMonth = quarterStart.getMonth();
  for (let i = 0; i < 3; i++) {
    const monthDate = new Date(quarterStart);
    monthDate.setMonth(currentMonth + i);
    months.push(
      monthDate.toLocaleDateString('en-US', { month: 'short' })
    );
  }

  // Determine status color based on progress
  const getStatusColor = () => {
    if (progressPercentage < 30) return KPI_COLORS.onTrack;
    if (progressPercentage < 70) return KPI_COLORS.behind;
    return KPI_COLORS.atRisk;
  };

  const statusColor = getStatusColor();

  return (
    <div className="space-y-4">
      {/* Timeline Bar */}
      <div className="relative">
        {/* Background bar */}
        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
          {/* Progress fill */}
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: statusColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Month markers */}
        <div className="absolute top-0 left-0 w-full h-3 flex justify-between pointer-events-none">
          {[0, 33.33, 66.66, 100].map((position, idx) => (
            <div
              key={idx}
              className="h-full w-0.5 bg-background"
              style={{ marginLeft: `${position}%` }}
            />
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {months.map((month, idx) => (
          <span key={idx}>{month}</span>
        ))}
        <span>End</span>
      </div>

      {/* Days remaining */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          <span className="font-semibold">{daysElapsed}</span>
          <span className="text-muted-foreground"> days elapsed</span>
        </div>
        <div className="text-sm">
          <span className="font-semibold" style={{ color: statusColor }}>
            {daysRemaining}
          </span>
          <span className="text-muted-foreground"> days remaining</span>
        </div>
      </div>
    </div>
  );
}

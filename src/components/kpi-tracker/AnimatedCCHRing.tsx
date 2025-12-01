import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { KPI_COLORS, getMotivationalText } from '@/lib/kpiColors';

interface AnimatedCCHRingProps {
  current: number;
  target: number;
  size?: number;
}

export function AnimatedCCHRing({ current, target, size = 200 }: AnimatedCCHRingProps) {
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const remaining = Math.max(0, target - current);
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  useEffect(() => {
    if (percentage >= 100 && !hasTriggeredConfetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [KPI_COLORS.cch.primary, KPI_COLORS.onTrack, '#FFD700'],
      });
      setHasTriggeredConfetti(true);
    }
  }, [percentage, hasTriggeredConfetti]);

  const getStrokeColor = () => {
    if (percentage >= 100) return KPI_COLORS.onTrack;
    if (percentage >= 90) return KPI_COLORS.cch.primary;
    if (percentage >= 60) return KPI_COLORS.behind;
    return KPI_COLORS.atRisk;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 10}
            stroke={getStrokeColor()}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={percentage >= 90 ? 'animate-pulse' : ''}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-center"
          >
            <div className="text-4xl font-bold" style={{ color: getStrokeColor() }}>
              {current.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">of {target.toFixed(1)} hrs</div>
            <div className="text-xs font-semibold mt-1" style={{ color: getStrokeColor() }}>
              {percentage.toFixed(0)}%
            </div>
          </motion.div>
        </div>
      </div>

      {/* Motivational text */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center text-sm font-medium max-w-xs"
        style={{ color: getStrokeColor() }}
      >
        {getMotivationalText(percentage, remaining)}
      </motion.p>
    </div>
  );
}

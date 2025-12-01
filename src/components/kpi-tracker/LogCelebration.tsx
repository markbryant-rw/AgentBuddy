import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Flame, Target } from 'lucide-react';

interface LogCelebrationProps {
  show: boolean;
  type: 'target' | 'streak' | 'personal-best';
  message: string;
  onComplete: () => void;
}

export function LogCelebration({ show, type, message, onComplete }: LogCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Trigger confetti
      const config = {
        particleCount: type === 'personal-best' ? 150 : 100,
        spread: type === 'personal-best' ? 100 : 70,
        origin: { y: 0.6 },
      };

      if (type === 'streak') {
        config.particleCount = 50;
        confetti({
          ...config,
          colors: ['#FF6B35', '#F7931E', '#FDC830'],
        });
      } else if (type === 'target') {
        confetti({
          ...config,
          colors: ['#8B5CF6', '#22C55E', '#FFD700'],
        });
      } else {
        confetti({
          ...config,
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
      }

      // Auto-dismiss after 3 seconds
      const timeout = setTimeout(onComplete, 3000);
      return () => clearTimeout(timeout);
    }
  }, [show, type, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'streak':
        return <Flame className="h-12 w-12 text-orange-500" />;
      case 'personal-best':
        return <Trophy className="h-12 w-12 text-yellow-500" />;
      default:
        return <Target className="h-12 w-12 text-green-500" />;
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onComplete}
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-card p-8 rounded-2xl shadow-2xl max-w-md text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              {getIcon()}
            </motion.div>
            <h3 className="text-2xl font-bold">{message}</h3>
            <p className="text-muted-foreground text-sm">
              Click anywhere to continue
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const getWorkspaceColor = (path: string) => {
  if (path.startsWith('/platform-admin')) return 'from-purple-500 to-violet-600';
  if (path.startsWith('/office-manager')) return 'from-teal-500 to-cyan-600';
  if (path.includes('/plan') || path.includes('/kpi')) return 'from-blue-500 to-indigo-600';
  if (path.includes('/prospect') || path.includes('/appraisal')) return 'from-teal-500 to-cyan-600';
  if (path.includes('/transact') || path.includes('/transaction')) return 'from-amber-500 to-orange-600';
  if (path.includes('/operate') || path.includes('/projects')) return 'from-purple-500 to-violet-600';
  if (path.includes('/grow') || path.includes('/knowledge')) return 'from-emerald-500 to-green-600';
  if (path.includes('/engage')) return 'from-pink-500 to-rose-600';
  return 'from-primary to-primary/80';
};

export const RouteLoader = () => {
  const location = useLocation();
  const gradientClass = getWorkspaceColor(location.pathname);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Animated gradient ring */}
        <div className="relative">
          <motion.div
            className={`h-16 w-16 rounded-full bg-gradient-to-tr ${gradientClass}`}
            animate={{
              rotate: 360,
              scale: [1, 1.05, 1],
            }}
            transition={{
              rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ opacity: 0.2 }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <div className={`h-12 w-12 rounded-full border-2 border-t-transparent bg-gradient-to-tr ${gradientClass} opacity-60`} />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-background" />
          </div>
        </div>
        
        {/* Loading text with shimmer */}
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading...
        </motion.p>
      </motion.div>
    </div>
  );
};

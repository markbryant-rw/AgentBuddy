import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';

const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15,
};

interface AnimatedOutletProps {
  className?: string;
}

export function AnimatedOutlet({ className }: AnimatedOutletProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

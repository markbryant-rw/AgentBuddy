import { useTopModules } from '@/hooks/useTopModules';
import { useResetModuleTracking } from '@/hooks/useResetModuleTracking';
import { Button } from '@/components/ui/button';
import { X, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { moduleConfig } from '@/lib/moduleConfig';
import { motion } from 'framer-motion';

export const DashboardQuickAccess = () => {
  const { topModules, loading } = useTopModules();
  const { resetTracking, isResetting } = useResetModuleTracking();
  const navigate = useNavigate();

  if (loading || topModules.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="mb-8"
    >
      <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border border-primary/20 overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50" />
        
        <div className="relative px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Label */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/80">
                Quick Access
              </span>
            </div>

            {/* Module buttons */}
            <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto">
              {topModules.map((moduleId, index) => {
                const config = moduleConfig[moduleId];
                if (!config) return null;
                
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={moduleId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(config.route)}
                      className="gap-2 hover:bg-primary/20 hover:text-primary transition-all hover:scale-105 bg-background/50 backdrop-blur-sm"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline text-sm font-medium">{config.name}</span>
                    </Button>
                  </motion.div>
                );
              })}
            </div>

            {/* Reset button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resetTracking()}
              disabled={isResetting}
              className="text-muted-foreground hover:text-foreground flex-shrink-0 hover:bg-destructive/10 transition-all"
              title="Reset Quick Access"
            >
              <X className="h-4 w-4" />
              <span className="hidden lg:inline ml-2 text-xs">Reset</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

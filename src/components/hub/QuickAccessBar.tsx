import { useTopModules } from '@/hooks/useTopModules';
import { useResetModuleTracking } from '@/hooks/useResetModuleTracking';
import { Button } from '@/components/ui/button';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { moduleConfig } from '@/lib/moduleConfig';

interface QuickAccessBarProps {
  visible: boolean;
}

export const QuickAccessBar = ({ visible }: QuickAccessBarProps) => {
  const { topModules, loading } = useTopModules();
  const { resetTracking, isResetting } = useResetModuleTracking();
  const navigate = useNavigate();

  if (loading || topModules.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed top-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm",
        "transition-transform duration-300 ease-in-out",
        visible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
              Quick Access
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto overflow-y-hidden">
            {topModules.map((moduleId) => {
              const config = moduleConfig[moduleId];
              if (!config) return null;
              
              const Icon = config.icon;
              
              return (
                <Button
                  key={moduleId}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(config.route)}
                  className="gap-2 hover:bg-primary/10 hover:text-primary hover:scale-100 transition-colors flex-shrink-0"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.name}</span>
                </Button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetTracking()}
            disabled={isResetting}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            title="Reset Quick Access"
          >
            <X className="h-4 w-4" />
            <span className="hidden lg:inline ml-2">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

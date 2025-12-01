import { Star, RotateCcw } from 'lucide-react';
import { FavoriteModuleCard } from './FavoriteModuleCard';
import { LucideIcon } from 'lucide-react';
import { ModuleId } from '@/hooks/useModuleAccess';
import { ModuleCategoryColor } from '@/lib/moduleColors';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useResetModuleTracking } from '@/hooks/useResetModuleTracking';

interface ModuleConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
  available?: boolean;
  categoryColor?: ModuleCategoryColor;
  category: string;
}

interface FavoriteModulesBarProps {
  topModules: string[];
  moduleConfig: Record<ModuleId, ModuleConfig>;
  badges?: Record<string, number>;
  loading?: boolean;
}

export const FavoriteModulesBar = ({
  topModules,
  moduleConfig,
  badges = {},
  loading = false,
}: FavoriteModulesBarProps) => {
  const { resetTracking, isResetting } = useResetModuleTracking();
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary fill-primary" />
          <h2 className="text-lg font-semibold">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary fill-primary" />
          <h2 className="text-lg font-semibold">Quick Access</h2>
          <span className="text-sm text-muted-foreground ml-2">
            Your most visited modules
          </span>
        </div>

        {/* Reset button - only show if there are modules */}
        {topModules.length > 0 && (
          <AlertDialog>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                      disabled={isResetting}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="text-xs">Reset</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all module visit tracking</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Quick Access?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all module visit tracking data and
                  reset your Quick Access bar to zero. You can rebuild it by visiting
                  your favorite modules again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetTracking()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isResetting ? 'Resetting...' : 'Reset All Data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {topModules.length === 0 ? (
        <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No modules visited yet - start exploring to see your favorites here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topModules.map((moduleId) => {
            const config = moduleConfig[moduleId as ModuleId];
            if (!config) return null;

            return (
              <FavoriteModuleCard
                key={moduleId}
                icon={config.icon}
                title={config.title}
                route={config.route}
                categoryColor={config.categoryColor}
                badge={badges[moduleId]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

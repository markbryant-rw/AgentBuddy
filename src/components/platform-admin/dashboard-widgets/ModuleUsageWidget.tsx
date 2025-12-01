import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useModuleUsage } from '@/hooks/useModuleUsage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export const ModuleUsageWidget = () => {
  const { data: modules, isLoading } = useModuleUsage();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-teal-500">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-white dark:from-teal-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            Module Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const topModule = modules?.[0];
  const totalVisits = modules?.reduce((sum, m) => sum + m.visit_count, 0) || 0;

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-teal-500">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-white dark:from-teal-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          Module Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totalVisits.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Visits (7d)</p>
          </div>
          <BarChart3 className="h-10 w-10 text-teal-600 opacity-20" />
        </div>
        
        {topModule && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Top Module</span>
              <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                {topModule.visit_count} visits
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{topModule.module_id.replace(/-/g, ' ')}</p>
          </div>
        )}
        
        <div className="space-y-2">
          {modules?.slice(0, 3).map((module, idx) => (
            <div key={module.module_id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground capitalize">
                {idx + 1}. {module.module_id.replace(/-/g, ' ')}
              </span>
              <span className="font-medium">{module.visit_count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

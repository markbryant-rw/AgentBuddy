import { Card } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WidgetSkeleton } from '@/components/ui/workspace-skeleton';

export const PlatformHealthWidget = () => {
  const { data: health, isLoading } = useQuery({
    queryKey: ['platform-health-widget'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_backend_health');
      if (error) throw error;

      const critical = data?.filter((d: any) => d.severity === 'critical' && d.issue_count > 0).length || 0;
      const warnings = data?.filter((d: any) => d.severity === 'warning' && d.issue_count > 0).length || 0;
      const ok = data?.filter((d: any) => d.severity === 'ok').length || 0;

      return { critical, warnings, ok, total: data?.length || 0 };
    },
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) {
    return <WidgetSkeleton workspace="platform-admin" rows={2} />;
  }

  const status = health?.critical! > 0 ? 'critical' : health?.warnings! > 0 ? 'warning' : 'healthy';

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">System Health</h3>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {status === 'healthy' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
              <div>
                <div className="text-2xl font-bold">All Good</div>
                <div className="text-sm text-muted-foreground">{health?.total} checks passed</div>
              </div>
            </div>
          )}
          {status === 'warning' && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-8 w-8" />
              <div>
                <div className="text-2xl font-bold">{health?.warnings} Warnings</div>
                <div className="text-sm text-muted-foreground">Needs attention</div>
              </div>
            </div>
          )}
          {status === 'critical' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-8 w-8" />
              <div>
                <div className="text-2xl font-bold">{health?.critical} Critical</div>
                <div className="text-sm text-muted-foreground">Immediate action required</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

import { Card } from '@/components/ui/card';
import { Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Skeleton } from '@/components/ui/skeleton';

export const OfficeDataHealthWidget = () => {
  const { activeOffice } = useOfficeSwitcher();

  const { data: health, isLoading } = useQuery({
    queryKey: ['office-data-health', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;

      const { data, error } = await supabase.rpc('check_backend_health', {
        p_office_id: activeOffice.id
      });

      if (error) throw error;

      const issues = data?.filter((d: any) => d.issue_count > 0 && d.severity !== 'ok') || [];
      const totalIssues = issues.reduce((sum: number, d: any) => sum + d.issue_count, 0);

      return { totalIssues, checks: data?.length || 0 };
    },
    enabled: !!activeOffice?.id,
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Data Health</h3>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{health?.totalIssues || 0}</div>
          <div className="text-sm text-muted-foreground">
            {health?.totalIssues === 0 ? 'All checks passed' : 'Issues found'}
          </div>
        </div>
        {health?.totalIssues === 0 ? (
          <CheckCircle className="h-8 w-8 text-green-600" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        )}
      </div>
    </Card>
  );
};

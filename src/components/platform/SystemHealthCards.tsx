import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import { Database, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

export const SystemHealthCards = () => {
  const { data: metrics, isLoading } = useSystemMetrics();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading system metrics...</div>;
  }

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.totalTables || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Main database tables
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics?.totalRows.toLocaleString() || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across major tables
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.activeErrors || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Unresolved issues
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.recentActivityCount || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Last 24 hours
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

import { useAuth } from '@/hooks/useAuth';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Navigate } from 'react-router-dom';
import { Loader2, CheckSquare, Building2, Activity, HeadphonesIcon } from 'lucide-react';
import { OfficeDataHealthWidget } from '@/components/office-manager/dashboard-widgets/OfficeDataHealthWidget';
import { CCHPerformanceWidget } from '@/components/office-manager/dashboard-widgets/CCHPerformanceWidget';
import { StockOverviewWidget } from '@/components/office-manager/dashboard-widgets/StockOverviewWidget';
import { TeamActivityWidget } from '@/components/office-manager/dashboard-widgets/TeamActivityWidget';
import { FlaggedProvidersWidget } from '@/components/office-manager/dashboard-widgets/FlaggedProvidersWidget';
import { WorkspaceCard } from '@/components/platform-admin/WorkspaceCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function OfficeManagerDashboard() {
  const { activeRole, loading, user } = useAuth();
  const { activeOffice, isLoading: officeLoading } = useOfficeSwitcher();

  const { data: workspaceStats } = useQuery({
    queryKey: ['office-workspace-stats', activeOffice?.id, user?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;

      const [tasks, teams] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('agency_id', activeOffice.id).eq('is_personal_team', false),
      ]);

      return {
        openTasks: tasks.count || 0,
        teams: teams.count || 0,
        helpRequests: 0, // Stubbed - help_requests table not implemented
      };
    },
    enabled: !!activeOffice?.id && !!user?.id,
  });

  if (loading || officeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (activeRole !== 'office_manager') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!activeOffice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">No Office Selected</h2>
          <p className="text-muted-foreground">
            Please select an office from the office switcher to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Office Manager Dashboard</h1>
        <p className="text-muted-foreground">{activeOffice.name} - Performance & Management</p>
      </div>

      {/* Hero Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <OfficeDataHealthWidget />
        <CCHPerformanceWidget />
        <StockOverviewWidget />
        <TeamActivityWidget />
      </div>

      {/* Flagged Providers Widget */}
      <FlaggedProvidersWidget />

      {/* Workspace Navigation */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">What do you want to do today?</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <WorkspaceCard
            title="OPERATE"
            description="Daily tasks, messages, and team coordination"
            icon={CheckSquare}
            path="/office-manager/operate"
            color="bg-blue-600"
            stats={[
              { label: 'Open Tasks', value: workspaceStats?.openTasks || 0 },
              { label: 'Messages', value: 0 },
              { label: 'Daily Items', value: 0 },
            ]}
          />
          
          <WorkspaceCard
            title="OFFICE"
            description="Team management, users, and lead sources"
            icon={Building2}
            path="/office-manager/office"
            color="bg-purple-600"
            stats={[
              { label: 'Teams', value: workspaceStats?.teams || 0 },
              { label: 'Total Users', value: 0 },
              { label: 'Lead Sources', value: 0 },
            ]}
          />
          
          <WorkspaceCard
            title="MONITOR"
            description="Stock board, listings, and pipeline analytics"
            icon={Activity}
            path="/office-manager/monitor"
            color="bg-green-600"
            stats={[
              { label: 'Live Listings', value: 0 },
              { label: 'Expiring Soon', value: 0 },
              { label: 'Pipeline Value', value: '$0' },
            ]}
          />
          
          <WorkspaceCard
            title="SUPPORT"
            description="Help requests, training, and reports"
            icon={HeadphonesIcon}
            path="/office-manager/support"
            color="bg-orange-600"
            stats={[
              { label: 'Open Requests', value: workspaceStats?.helpRequests || 0, variant: 'destructive' },
              { label: 'Training Items', value: 0 },
              { label: 'Reports', value: 0 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

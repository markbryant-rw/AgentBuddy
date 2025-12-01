import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2, CheckSquare, Activity, Users, MessageSquarePlus } from 'lucide-react';
import { PlatformHealthWidget } from '@/components/platform-admin/dashboard-widgets/PlatformHealthWidget';
import { DataIntegrityWidget } from '@/components/platform-admin/dashboard-widgets/DataIntegrityWidget';
import { PlatformActivityWidget } from '@/components/platform-admin/dashboard-widgets/PlatformActivityWidget';
import { QuickActionsWidget } from '@/components/platform-admin/dashboard-widgets/QuickActionsWidget';
import { WorkspaceCard } from '@/components/platform-admin/WorkspaceCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PlatformAdminDashboard() {
  const { isPlatformAdmin, loading, user } = useAuth();

  const { data: workspaceStats } = useQuery({
    queryKey: ['platform-workspace-stats', user?.id],
    queryFn: async () => {
      const [tasks, bugs, features, users] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false),
        supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'triage'),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        openTasks: tasks.count || 0,
        pendingBugs: bugs.count || 0,
        pendingFeatures: features.count || 0,
        totalUsers: users.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Administration</h1>
        <p className="text-muted-foreground">System-wide monitoring and management</p>
      </div>

      {/* Hero Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PlatformHealthWidget />
        <DataIntegrityWidget />
        <PlatformActivityWidget />
        <QuickActionsWidget />
      </div>

      {/* Workspace Navigation */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">What do you want to do today?</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <WorkspaceCard
            title="OPERATE"
            description="Daily tasks, messages, and announcements"
            icon={CheckSquare}
            path="/platform-admin/operate"
            color="bg-blue-600"
            stats={[
              { label: 'Open Tasks', value: workspaceStats?.openTasks || 0 },
              { label: 'Messages', value: 0 },
              { label: 'Daily Items', value: 0 },
            ]}
          />
          
          <WorkspaceCard
            title="MONITOR"
            description="Health dashboard, activity, and module usage"
            icon={Activity}
            path="/platform-admin/monitor"
            color="bg-green-600"
            stats={[
              { label: 'Health Checks', value: 'OK', variant: 'default' },
              { label: 'Active Users', value: workspaceStats?.totalUsers || 0 },
              { label: 'Uptime', value: '99.9%' },
            ]}
          />
          
          <WorkspaceCard
            title="MANAGE"
            description="Users, offices, and impersonation audit"
            icon={Users}
            path="/platform-admin/manage"
            color="bg-purple-600"
            stats={[
              { label: 'Total Users', value: workspaceStats?.totalUsers || 0 },
              { label: 'Active Offices', value: 0 },
              { label: 'Pending Invites', value: 0 },
            ]}
          />
          
          <WorkspaceCard
            title="FEEDBACK"
            description="Bug reports and feature requests"
            icon={MessageSquarePlus}
            path="/platform-admin/feedback"
            color="bg-orange-600"
            stats={[
              { label: 'Bugs', value: workspaceStats?.pendingBugs || 0, variant: 'destructive' },
              { label: 'Features', value: workspaceStats?.pendingFeatures || 0 },
              { label: 'This Week', value: 0 },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

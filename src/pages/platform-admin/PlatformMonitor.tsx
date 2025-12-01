import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, TrendingUp } from 'lucide-react';
import { SystemHealthOverviewWidget } from '@/components/platform-admin/dashboard-widgets/SystemHealthOverviewWidget';
import { RecentActivityWidget } from '@/components/platform-admin/dashboard-widgets/RecentActivityWidget';
import { ModuleUsageWidget } from '@/components/platform-admin/dashboard-widgets/ModuleUsageWidget';

export default function PlatformMonitor() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MONITOR</h1>
        <p className="text-muted-foreground">System health, activity, and usage analytics</p>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Health Dashboard
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            System Activity
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Module Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="mt-6">
          <SystemHealthOverviewWidget />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <RecentActivityWidget />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <ModuleUsageWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}

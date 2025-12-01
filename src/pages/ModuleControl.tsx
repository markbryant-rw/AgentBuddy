import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleCatalogue } from '@/components/platform/ModuleCatalogue';
import { ModulePoliciesManager } from '@/components/platform/ModulePoliciesManager';
import { Settings, Package, Shield, Calendar, BarChart3, FileText } from 'lucide-react';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';

const ModuleControl = () => {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Module Access Control"
        description="Manage module access across global, office, team, and user levels"
        backPath="/platform-admin"
      />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">

      <Tabs defaultValue="catalogue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
          <TabsTrigger value="catalogue" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Catalogue</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
          <TabsTrigger value="rollouts" className="gap-2" disabled>
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rollouts</span>
          </TabsTrigger>
          <TabsTrigger value="trials" className="gap-2" disabled>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Trials</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2" disabled>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2" disabled>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="space-y-6">
          <ModuleCatalogue />
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <ModulePoliciesManager />
        </TabsContent>

        <TabsContent value="rollouts">
          <div className="p-8 text-center text-muted-foreground">
            Rollouts feature coming in Phase 4
          </div>
        </TabsContent>

        <TabsContent value="trials">
          <div className="p-8 text-center text-muted-foreground">
            Trials feature coming in Phase 4
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="p-8 text-center text-muted-foreground">
            Reports feature coming in Phase 5
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="p-8 text-center text-muted-foreground">
            Audit Log feature coming in Phase 5
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default ModuleControl;
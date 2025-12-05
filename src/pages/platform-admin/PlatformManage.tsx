import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Palette } from 'lucide-react';
import { OfficeManagementTab } from '@/components/platform-admin/OfficeManagementTab';
import { ImpersonationAuditTab } from '@/components/platform-admin/ImpersonationAuditTab';
import { ThemeLibraryTab } from '@/components/theme/ThemeLibraryTab';

export default function PlatformManage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MANAGE</h1>
        <p className="text-muted-foreground">User management, offices, and security</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Impersonation Audit
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Themes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <OfficeManagementTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <ImpersonationAuditTab />
        </TabsContent>

        <TabsContent value="themes" className="mt-6">
          <ThemeLibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
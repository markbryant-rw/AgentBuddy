import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Tag } from 'lucide-react';
import OfficeLeadSources from '@/pages/office-manager/OfficeLeadSources';

export default function OfficeManagerOffice() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OFFICE</h1>
        <p className="text-muted-foreground">Team management, users, and configuration</p>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Lead Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Team Management coming soon...
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            User Management coming soon...
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <OfficeLeadSources />
        </TabsContent>
      </Tabs>
    </div>
  );
}

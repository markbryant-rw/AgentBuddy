import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeadphonesIcon, BookOpen, FileText } from 'lucide-react';

export default function OfficeManagerSupport() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SUPPORT</h1>
        <p className="text-muted-foreground">Help requests, training resources, and reports</p>
      </div>

      <Tabs defaultValue="help" className="w-full">
        <TabsList>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <HeadphonesIcon className="h-4 w-4" />
            Help Requests
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Training Resources
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Office Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Help Requests coming soon...
          </div>
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Training Resources coming soon...
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Office Reports coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

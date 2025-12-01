import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Clock, TrendingUp } from 'lucide-react';

export default function OfficeManagerMonitor() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MONITOR</h1>
        <p className="text-muted-foreground">Stock board, listings, and pipeline analytics</p>
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Stock Board
          </TabsTrigger>
          <TabsTrigger value="expiry" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Listing Expiry
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Appraisal Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Stock Board coming soon...
          </div>
        </TabsContent>

        <TabsContent value="expiry" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Listing Expiry coming soon...
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Appraisal Pipeline coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

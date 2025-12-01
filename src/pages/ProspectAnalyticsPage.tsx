import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useListingPipeline } from '@/hooks/useListingPipeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppraisalsAnalyticsTab } from '@/components/analytics/AppraisalsAnalyticsTab';
import { OpportunitiesAnalyticsTab } from '@/components/analytics/OpportunitiesAnalyticsTab';

const ProspectAnalyticsPage = () => {
  const { appraisals } = useLoggedAppraisals();
  const { listings } = useListingPipeline();

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="prospect" currentPage="Analytics" />
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Prospect Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive insights, conversion rates, and performance trends
            </p>
          </div>

      {/* Tabs */}
      <Tabs defaultValue="appraisals" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="appraisals">Appraisals</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appraisals" className="mt-6">
          <AppraisalsAnalyticsTab appraisals={appraisals} opportunities={listings} />
        </TabsContent>
        
        <TabsContent value="opportunities" className="mt-6">
          <OpportunitiesAnalyticsTab listings={listings} />
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProspectAnalyticsPage;

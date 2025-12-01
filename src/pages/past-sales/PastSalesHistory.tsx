import { useState, useEffect } from "react";
import { Plus, MapPin, BarChart3, Table as TableIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePastSales } from "@/hooks/usePastSales";
import { usePastSalesAnalytics } from "@/hooks/usePastSalesAnalytics";
import { useTeam } from "@/hooks/useTeam";
import PastSalesTable from "@/components/past-sales/PastSalesTable";
import PastSalesMap from "@/components/past-sales/PastSalesMap";
import PastSalesAnalytics from "@/components/past-sales/PastSalesAnalytics";
import PastSaleDetailDialog from "@/components/past-sales/PastSaleDetailDialog";
import PastSalesStatsBar from "@/components/past-sales/PastSalesStatsBar";
import { PastSalesImportDialog } from "@/components/past-sales/PastSalesImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const PastSalesHistory = () => {
  const [selectedPastSaleId, setSelectedPastSaleId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { team } = useTeam();
  const { pastSales, isLoading, refetch } = usePastSales(team?.id);
  const analytics = usePastSalesAnalytics(pastSales);

  const handleOpenDetail = (pastSaleId: string) => {
    setSelectedPastSaleId(pastSaleId);
  };

  const handleCloseDetail = () => {
    setSelectedPastSaleId(null);
  };

  const handleAddNew = () => {
    setSelectedPastSaleId(null);
    setIsAddDialogOpen(true);
  };

  const selectedPastSale = pastSales.find((ps) => ps.id === selectedPastSaleId);

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Past Sales History" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Past Sales History</h1>
              <p className="text-muted-foreground">
                Track your sales record and build referral intelligence
              </p>
            </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Past Sale
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <PastSalesStatsBar analytics={analytics} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon className="mr-2 h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-6">
          <PastSalesTable
            pastSales={pastSales}
            isLoading={isLoading}
            onOpenDetail={handleOpenDetail}
          />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <PastSalesMap pastSales={pastSales} onOpenDetail={handleOpenDetail} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <PastSalesAnalytics analytics={analytics} pastSales={pastSales} />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <PastSaleDetailDialog
        pastSale={selectedPastSale}
        isOpen={!!selectedPastSaleId || isAddDialogOpen}
        onClose={() => {
          handleCloseDetail();
          setIsAddDialogOpen(false);
        }}
      />

      {/* Import Dialog */}
      <PastSalesImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        teamId={team?.id || ''}
        onImportComplete={() => refetch()}
      />
        </div>
      </div>
    </div>
  );
};

export default PastSalesHistory;
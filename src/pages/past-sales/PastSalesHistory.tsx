import { useState, useMemo } from "react";
import { Plus, MapPin, BarChart3, Table as TableIcon, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePastSales } from "@/hooks/usePastSales";
import { usePastSalesAnalytics } from "@/hooks/usePastSalesAnalytics";
import { useTeam } from "@/hooks/useTeam";
import PastSalesTable from "@/components/past-sales/PastSalesTable";
import PastSalesMap from "@/components/past-sales/PastSalesMap";
import PastSalesAnalytics from "@/components/past-sales/PastSalesAnalytics";
import PastSaleDetailDialog from "@/components/past-sales/PastSaleDetailDialog";
import PastSalesStatsBar from "@/components/past-sales/PastSalesStatsBar";
import { PastSalesImportDialog } from "@/components/past-sales/PastSalesImportDialog";
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const PastSalesHistory = () => {
  const [selectedPastSaleId, setSelectedPastSaleId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [hideWithdrawn, setHideWithdrawn] = useState(false);
  const [hideSold, setHideSold] = useState(false);
  const { team } = useTeam();
  const { pastSales, isLoading, refetch, removeDuplicates, isRemovingDuplicates } = usePastSales(team?.id);
  
  // Filter past sales based on checkbox state
  const filteredPastSales = useMemo(() => {
    return pastSales.filter(sale => {
      if (hideWithdrawn && sale.status === 'withdrawn') return false;
      if (hideSold && (sale.status === 'won_and_sold' || sale.status === 'settled')) return false;
      return true;
    });
  }, [pastSales, hideWithdrawn, hideSold]);

  const analytics = usePastSalesAnalytics(filteredPastSales);

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

  const handleRemoveDuplicates = async () => {
    await removeDuplicates();
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
              <Button 
                variant="outline" 
                onClick={handleRemoveDuplicates}
                disabled={isRemovingDuplicates}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isRemovingDuplicates ? 'Removing...' : 'Remove Duplicates'}
              </Button>
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

          {/* Filter Checkboxes */}
          <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="hide-withdrawn" 
                checked={hideWithdrawn}
                onCheckedChange={(checked) => setHideWithdrawn(checked === true)}
              />
              <Label htmlFor="hide-withdrawn" className="text-sm cursor-pointer">
                Hide Withdrawn
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="hide-sold" 
                checked={hideSold}
                onCheckedChange={(checked) => setHideSold(checked === true)}
              />
              <Label htmlFor="hide-sold" className="text-sm cursor-pointer">
                Hide Sold
              </Label>
            </div>
            {(hideWithdrawn || hideSold) && (
              <span className="text-xs text-muted-foreground ml-auto">
                Showing {filteredPastSales.length} of {pastSales.length} records
              </span>
            )}
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
                pastSales={filteredPastSales}
                isLoading={isLoading}
                onOpenDetail={handleOpenDetail}
              />
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <PastSalesMap pastSales={filteredPastSales} onOpenDetail={handleOpenDetail} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <PastSalesAnalytics analytics={analytics} pastSales={filteredPastSales} />
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
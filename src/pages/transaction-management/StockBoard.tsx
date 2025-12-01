import { useState } from 'react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { StockBoardSummaryCards } from '@/components/transaction-management/StockBoardSummaryCards';
import { StockBoardTable } from '@/components/transaction-management/StockBoardTable';
import { TransactionDetailDrawer } from '@/components/transaction-management/TransactionDetailDrawer';
import { EditTransactionDialog } from '@/components/transaction-management/EditTransactionDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type FilterTab = 'all' | 'misaligned' | 'aligned' | 'pending';

export default function StockBoard() {
  const navigate = useNavigate();
  const { transactions, isLoading, updateTransaction } = useTransactions();
  const queryClient = useQueryClient();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const activeTransactions = transactions.filter(t => !t.archived);

  // Filter by search and alignment status
  const filteredTransactions = activeTransactions.filter((t) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        t.address?.toLowerCase().includes(query) ||
        t.suburb?.toLowerCase().includes(query) ||
        t.client_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Alignment filter
    if (activeTab !== 'all') {
      const alignment = calculatePriceAlignment(t.vendor_price, t.team_price);
      if (activeTab === 'misaligned' && alignment.status !== 'misaligned') return false;
      if (activeTab === 'aligned' && alignment.status !== 'aligned') return false;
      if (activeTab === 'pending' && alignment.status !== 'pending') return false;
    }

    return true;
  });

  // Count by status for tab badges
  const statusCounts = activeTransactions.reduce(
    (acc, t) => {
      const alignment = calculatePriceAlignment(t.vendor_price, t.team_price);
      acc[alignment.status]++;
      return acc;
    },
    { aligned: 0, misaligned: 0, pending: 0 } as Record<string, number>
  );

  const handleView = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailDrawerOpen(true);
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleEditSave = async (id: string, updates: Partial<Transaction>) => {
    await updateTransaction({ id, updates });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    // Refresh selected transaction
    const updated = transactions.find(t => t.id === id);
    if (updated) {
      setSelectedTransaction(updated);
    }
  };

  const handleStageChange = async (transactionId: string, newStage: any) => {
    try {
      // Note: Direct stage changes are mainly for backward compatibility
      // The TransactionDetailDrawer uses StageTransitionDialog and DealCollapseDialog
      
      const { error } = await supabase
        .from('transactions')
        .update({ stage: newStage })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success(`Stage updated to ${newStage}`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDetailDrawerOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stage');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Stock Board" />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Stock Board</h1>
              <p className="text-muted-foreground mt-1">
                Monitor price alignment across your active listings
              </p>
            </div>
          </div>

      {/* Summary Cards */}
      <StockBoardSummaryCards transactions={activeTransactions} />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address, suburb, or client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({activeTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="misaligned" className="text-red-600 dark:text-red-400">
            Misaligned ({statusCounts.misaligned})
          </TabsTrigger>
          <TabsTrigger value="aligned" className="text-green-600 dark:text-green-400">
            Aligned ({statusCounts.aligned})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({statusCounts.pending})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading transactions...
            </div>
          ) : (
            <StockBoardTable
              transactions={filteredTransactions}
              onView={handleView}
              onEdit={handleEdit}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onStageChange={handleStageChange}
        onEdit={handleEditSave}
      />

      {/* Edit Dialog */}
      {selectedTransaction && (
        <EditTransactionDialog
          transaction={selectedTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleEditSave}
          />
        )}
        </div>
      </div>
    </div>
  );
}

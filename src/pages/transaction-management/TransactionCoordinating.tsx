import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Settings, TrendingDown, Archive, Map } from 'lucide-react';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { useTransactions, Transaction, TransactionStage } from '@/hooks/useTransactions';
import { TransactionKanbanBoard } from '@/components/transaction-management/TransactionKanbanBoard';
import { TransactionDetailDrawer } from '@/components/transaction-management/TransactionDetailDrawer';
import { CreateTransactionDialog } from '@/components/transaction-management/CreateTransactionDialog';
import { EditTransactionDialog } from '@/components/transaction-management/EditTransactionDialog';

import { TerritoryMapModal } from '@/components/transaction-management/TerritoryMapModal';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function TransactionCoordinating() {
  const { transactions, isLoading, updateTransaction, deleteTransaction } = useTransactions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Filter transactions by search query and archive status (memoized for performance)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filter by archive status
      if (showArchived && !t.archived) return false;
      if (!showArchived && t.archived) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.address?.toLowerCase().includes(query) ||
          t.suburb?.toLowerCase().includes(query) ||
          t.client_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [transactions, showArchived, searchQuery]);

  // Count misaligned transactions
  const misalignedCount = useMemo(() => {
    return transactions.filter(t => {
      if (t.archived) return false;
      const alignment = calculatePriceAlignment(t.vendor_price, t.team_price);
      return alignment.status === 'misaligned';
    }).length;
  }, [transactions]);

  const handleCardClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Close map modal when opening detail drawer to prevent interaction conflicts
    setMapModalOpen(false);
    setDetailDrawerOpen(true);
  };

  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    // Close map modal to prevent Leaflet crashes during deletion
    setMapModalOpen(false);
    setEditDialogOpen(true);
  };

  const handleEditSave = async (id: string, updates: Partial<Transaction>) => {
    await updateTransaction({ id, updates });
  };

  const handleDelete = async (id: string) => {
    try {
      // Close all modals first to prevent Leaflet from trying to update during deletion
      setMapModalOpen(false);
      setEditDialogOpen(false);
      setDetailDrawerOpen(false);
      
      await deleteTransaction(id);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStageChange = async (transactionId: string, newStage: TransactionStage) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      
      // Note: Direct stage changes are mainly for backward compatibility
      // The TransactionDetailDrawer uses StageTransitionDialog and DealCollapseDialog
      // which capture required data at each transition
      
      const { error } = await supabase
        .from('transactions')
        .update({ stage: newStage })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success(`Moved to ${newStage}`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // Send notification when moving to unconditional
      if (newStage === 'unconditional' && transaction) {
        try {
          await supabase.functions.invoke('notify-team-transaction', {
            body: {
              transactionId: transactionId,
              eventType: 'moved_to_unconditional',
              transactionAddress: transaction.address,
              teamId: transaction.team_id,
            },
          });
        } catch (notifError) {
          console.error('Failed to send unconditional notification:', notifError);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stage');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Transaction Coordinating" />
      <div className="flex-1 overflow-auto">
        <div className="px-4 md:px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Transaction Co-ordinating</h1>
          <p className="text-muted-foreground mt-1">
            Manage listings from signed to settled
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="default"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? 'Show Active' : 'Show Completed'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/stock-board')}
            className="relative"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Stock Board
            {misalignedCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {misalignedCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/transaction-templates')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Templates
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address, suburb, or vendor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban Board */}
      <TransactionKanbanBoard
        transactions={filteredTransactions}
        onCardClick={handleCardClick}
        onCardEdit={handleEditClick}
        onAddTransaction={() => setCreateDialogOpen(true)}
        loading={isLoading}
      />

      {/* Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onStageChange={handleStageChange}
        onEdit={handleEditSave}
        onDelete={handleDelete}
      />

      {/* Create Dialog */}
      <CreateTransactionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Dialog */}
      {selectedTransaction && (
        <EditTransactionDialog
          transaction={selectedTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      )}


      {/* Territory Map Modal */}
          {/* Territory Map Modal */}
          <TerritoryMapModal
            open={mapModalOpen}
            onOpenChange={setMapModalOpen}
            transactions={filteredTransactions}
            searchQuery={searchQuery}
            onTransactionSelect={handleCardClick}
            onEditClick={handleEditClick}
          />
        </div>
      </div>
    </div>
  );
}
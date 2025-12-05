import { FileText, Home, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { usePastSales, PastSale } from '@/hooks/usePastSales';
import { useTeam } from '@/hooks/useTeam';
import { useTransactionGeocoding } from '@/hooks/useTransactionGeocoding';
import TransactNavigationCards from '@/components/transact/TransactNavigationCards';
import TransactMap from '@/components/transact/TransactMap';
import { TransactionDetailDrawer } from '@/components/transaction-management/TransactionDetailDrawer';
import PastSaleDetailDialog from '@/components/past-sales/PastSaleDetailDialog';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';
import { StatCard } from '@/components/ui/stat-card';

const TransactDashboard = () => {
  const { team } = useTeam();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { pastSales, isLoading: pastSalesLoading } = usePastSales(team?.id);
  const { geocodeAll, isGeocoding } = useTransactionGeocoding();

  // Detail drawer/dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionDrawerOpen, setTransactionDrawerOpen] = useState(false);
  const [selectedPastSale, setSelectedPastSale] = useState<PastSale | null>(null);
  const [pastSaleDialogOpen, setPastSaleDialogOpen] = useState(false);

  // Handlers for map clicks
  const handleTransactionClick = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setTransactionDrawerOpen(true);
    }
  };

  const handlePastSaleClick = (pastSaleId: string) => {
    const sale = pastSales.find(s => s.id === pastSaleId);
    if (sale) {
      setSelectedPastSale(sale);
      setPastSaleDialogOpen(true);
    }
  };

  // Active transactions stats
  const activeTransactions = transactions.filter(t => t.stage !== 'settled' && !t.archived);
  const pipelineValue = activeTransactions.reduce((sum, t) => sum + (t.team_price || 0), 0);

  // Stage breakdown
  const stageBreakdown = activeTransactions.reduce((acc, t) => {
    acc[t.stage] = (acc[t.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Price alignment
  const misalignedCount = activeTransactions.filter(t => {
    const alignment = calculatePriceAlignment(t.vendor_price, t.team_price);
    return alignment.status === 'misaligned';
  }).length;

  // This month's settlements
  const thisMonthSettlements = transactions.filter(t => {
    if (!t.settlement_date) return false;
    const settlementDate = new Date(t.settlement_date);
    const now = new Date();
    return settlementDate.getMonth() === now.getMonth() && 
           settlementDate.getFullYear() === now.getFullYear();
  });

  // Average settlement time
  const settledTransactions = transactions.filter(t => 
    t.stage === 'settled' && t.settlement_date && t.contract_date
  );
  const avgSettlementDays = settledTransactions.length > 0
    ? Math.round(settledTransactions.reduce((sum, t) => {
        const days = Math.floor(
          (new Date(t.settlement_date!).getTime() - new Date(t.contract_date!).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / settledTransactions.length)
    : 0;

  // Past sales stats
  const soldSales = pastSales.filter(s => s.status === 'sold' || s.status === 'won_and_sold');
  const thisQuarterSales = soldSales.filter(s => {
    if (!s.settlement_date) return false;
    const settlementDate = new Date(s.settlement_date);
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return settlementDate >= quarterStart;
  });

  const conversionRate = pastSales.length > 0 
    ? Math.round((soldSales.length / pastSales.length) * 100)
    : 0;

  // Stock board stats
  const alignmentRate = activeTransactions.length > 0
    ? Math.round(((activeTransactions.length - misalignedCount) / activeTransactions.length) * 100)
    : 0;

  // Listing expiry stats
  const activeListings = activeTransactions.filter(t => t.stage === 'live' || t.stage === 'signed');
  const criticalListings = activeListings.filter(t => {
    const daysUntil = calculateDaysUntilExpiry(t.listing_expires_date);
    const status = getExpiryStatus(daysUntil);
    return status.status === 'critical';
  }).length;

  const expiringThisMonth = activeListings.filter(t => {
    const daysUntil = calculateDaysUntilExpiry(t.listing_expires_date);
    return daysUntil !== null && daysUntil >= 0 && daysUntil <= 30;
  }).length;

  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div className="animate-card-enter">
        <div className="flex items-center gap-fluid-md">
          <FileText className="h-icon-lg w-icon-lg text-amber-600" />
          <h1 className="text-fluid-3xl font-bold">Transact Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Manage active listings and track your sales performance
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-fluid-md animate-card-enter stagger-1">
        <StatCard
          workspace="transact"
          icon={Home}
          label="Active Transactions"
          value={transactionsLoading ? '...' : activeTransactions.length}
        />
        <StatCard
          workspace="transact"
          icon={DollarSign}
          label="Pipeline Value"
          value={transactionsLoading ? '...' : `$${(pipelineValue / 1000000).toFixed(1)}M`}
        />
        <StatCard
          workspace="transact"
          icon={TrendingUp}
          label="This Month's Settlements"
          value={transactionsLoading ? '...' : thisMonthSettlements.length}
        />
        <StatCard
          workspace="transact"
          icon={Clock}
          label="Avg Settlement Time"
          value={transactionsLoading ? '...' : `${avgSettlementDays} days`}
        />
      </div>

      {/* Navigation Cards */}
      <div className="animate-card-enter stagger-2">
        <TransactNavigationCards
          activeTransactions={activeTransactions.length}
          underContract={stageBreakdown['under_contract'] || 0}
          unconditional={stageBreakdown['unconditional'] || 0}
          misalignedPrices={misalignedCount}
          alignmentRate={alignmentRate}
          totalSales={soldSales.length}
          quarterlySales={thisQuarterSales.length}
          conversionRate={conversionRate}
          criticalListings={criticalListings}
          expiringThisMonth={expiringThisMonth}
          isLoading={transactionsLoading || pastSalesLoading}
        />
      </div>

      {/* Map View */}
      <div className="mt-fluid-lg animate-card-enter stagger-3">
        <h2 className="text-fluid-2xl font-bold mb-fluid-md">Map View</h2>
        <TransactMap
          transactions={transactions}
          pastSales={pastSales}
          onAutoGeocode={() => geocodeAll(transactions)}
          isGeocoding={isGeocoding}
          onTransactionClick={handleTransactionClick}
          onPastSaleClick={handlePastSaleClick}
        />
      </div>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={transactionDrawerOpen}
        onOpenChange={setTransactionDrawerOpen}
      />

      {/* Past Sale Detail Dialog */}
      <PastSaleDetailDialog
        pastSale={selectedPastSale || undefined}
        isOpen={pastSaleDialogOpen}
        onClose={() => setPastSaleDialogOpen(false)}
      />
    </div>
  );
};

export default TransactDashboard;
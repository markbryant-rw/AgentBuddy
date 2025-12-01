import { FileText } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { usePastSales } from '@/hooks/usePastSales';
import { useTeam } from '@/hooks/useTeam';
import TransactNavigationCards from '@/components/transact/TransactNavigationCards';
import TransactMap from '@/components/transact/TransactMap';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';

const TransactDashboard = () => {
  const { team } = useTeam();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { pastSales, isLoading: pastSalesLoading } = usePastSales(team?.id);

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

  const totalSalesValue = soldSales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Transact Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage active listings and track your sales performance
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Transactions</div>
          <div className="text-2xl font-bold mt-1">
            {transactionsLoading ? '...' : activeTransactions.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Pipeline Value</div>
          <div className="text-2xl font-bold mt-1">
            {transactionsLoading ? '...' : `$${(pipelineValue / 1000000).toFixed(1)}M`}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">This Month's Settlements</div>
          <div className="text-2xl font-bold mt-1">
            {transactionsLoading ? '...' : thisMonthSettlements.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Avg Settlement Time</div>
          <div className="text-2xl font-bold mt-1">
            {transactionsLoading ? '...' : `${avgSettlementDays} days`}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
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

      {/* Map View */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Map View</h2>
        <TransactMap
          transactions={transactions}
          pastSales={pastSales}
        />
      </div>
    </div>
  );
};

export default TransactDashboard;

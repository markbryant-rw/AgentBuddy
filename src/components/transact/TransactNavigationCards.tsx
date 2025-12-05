import { Flame, BarChart3, TrendingDown, Clock } from 'lucide-react';
import { WorkspaceCard } from '@/components/ui/workspace-card';

interface TransactNavigationCardsProps {
  activeTransactions: number;
  underContract: number;
  unconditional: number;
  misalignedPrices: number;
  alignmentRate: number;
  totalSales: number;
  quarterlySales: number;
  conversionRate: number;
  criticalListings?: number;
  expiringThisMonth?: number;
  isLoading: boolean;
}

const TransactNavigationCards = ({
  activeTransactions,
  underContract,
  unconditional,
  misalignedPrices,
  alignmentRate,
  totalSales,
  quarterlySales,
  conversionRate,
  criticalListings = 0,
  expiringThisMonth = 0,
  isLoading,
}: TransactNavigationCardsProps) => {
  const cards = [
    {
      title: 'Current Listings',
      description: 'Manage your active transaction pipeline',
      icon: Flame,
      route: '/transaction-coordinating',
      stats: [
        { label: 'Active Transactions', value: isLoading ? '...' : activeTransactions },
        { label: 'Under Contract', value: isLoading ? '...' : underContract },
        { label: 'Price Misaligned', value: isLoading ? '...' : misalignedPrices, alert: misalignedPrices > 0 },
      ],
    },
    {
      title: 'Stock Board',
      description: 'Monitor price alignment and stock health',
      icon: TrendingDown,
      route: '/stock-board',
      stats: [
        { label: 'Active Stock', value: isLoading ? '...' : activeTransactions },
        { label: 'Misaligned', value: isLoading ? '...' : misalignedPrices, alert: misalignedPrices > 0 },
        { label: 'Alignment Rate', value: isLoading ? '...' : `${alignmentRate}%` },
      ],
    },
    {
      title: 'Listing Expiry Report',
      description: 'Monitor agency agreement expiry dates',
      icon: Clock,
      route: '/listing-expiry-report',
      stats: [
        { label: 'Active Listings', value: isLoading ? '...' : activeTransactions },
        { label: 'Critical', value: isLoading ? '...' : criticalListings, alert: criticalListings > 0 },
        { label: 'Expiring This Month', value: isLoading ? '...' : expiringThisMonth },
      ],
    },
    {
      title: 'Past Sales History',
      description: 'Track performance and build referral intelligence',
      icon: BarChart3,
      route: '/past-sales-history',
      stats: [
        { label: 'Total Sales', value: isLoading ? '...' : totalSales },
        { label: 'This Quarter', value: isLoading ? '...' : quarterlySales },
        { label: 'Conversion Rate', value: isLoading ? '...' : `${conversionRate}%` },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-lg">
      {cards.map((card) => (
        <WorkspaceCard
          key={card.route}
          workspace="transact"
          title={card.title}
          description={card.description}
          icon={card.icon}
          route={card.route}
          stats={card.stats}
        />
      ))}
    </div>
  );
};

export default TransactNavigationCards;

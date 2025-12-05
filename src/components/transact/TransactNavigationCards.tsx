import { useNavigate } from 'react-router-dom';
import { Flame, BarChart3, TrendingDown, ArrowRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();

  // Using Transact workspace theme colors (amber/orange)
  const cards = [
    {
      title: 'Current Listings',
      description: 'Manage your active transaction pipeline',
      icon: Flame,
      route: '/transaction-coordinating',
      gradient: 'from-amber-500/10 to-orange-600/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
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
      gradient: 'from-amber-500/10 to-orange-600/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
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
      gradient: 'from-amber-500/10 to-orange-600/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
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
      gradient: 'from-amber-500/10 to-orange-600/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      stats: [
        { label: 'Total Sales', value: isLoading ? '...' : totalSales },
        { label: 'This Quarter', value: isLoading ? '...' : quarterlySales },
        { label: 'Conversion Rate', value: isLoading ? '...' : `${conversionRate}%` },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-fluid-lg">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.route}
            className={cn(
              'group relative overflow-hidden cursor-pointer',
              'hover:shadow-xl transition-all duration-300',
              'border-l-4 border-l-amber-500'
            )}
            onClick={() => navigate(card.route)}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
            
            <div className="relative p-fluid-lg space-y-fluid-md">
              {/* Icon & Title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-fluid-md">
                  <div className={cn('p-3 rounded-lg', card.iconBg)}>
                    <Icon className={cn('h-icon-md w-icon-md', card.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-fluid-xl font-bold">{card.title}</h3>
                    <p className="text-fluid-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-fluid-sm pt-fluid-md border-t">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-fluid-xs text-muted-foreground">{stat.label}</div>
                    <div className={cn(
                      'text-fluid-lg font-bold',
                      stat.alert && 'text-red-600 dark:text-red-400'
                    )}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform text-fluid-sm"
                >
                  View Details
                  <ArrowRight className="ml-2 h-icon-sm w-icon-sm" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TransactNavigationCards;

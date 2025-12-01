import { Card, CardContent } from '@/components/ui/card';
import { Transaction } from '@/hooks/useTransactions';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { TrendingDown, TrendingUp, Clock, Activity } from 'lucide-react';

interface StockBoardSummaryCardsProps {
  transactions: Transaction[];
}

export function StockBoardSummaryCards({ transactions }: StockBoardSummaryCardsProps) {
  const activeTransactions = transactions.filter(t => !t.archived);
  
  const alignmentStats = activeTransactions.reduce(
    (acc, t) => {
      const alignment = calculatePriceAlignment(t.vendor_price, t.team_price);
      if (alignment.status === 'aligned') acc.aligned++;
      else if (alignment.status === 'misaligned') acc.misaligned++;
      else acc.pending++;
      
      if (alignment.status !== 'pending') {
        acc.totalPercentage += alignment.percentage;
        acc.count++;
      }
      return acc;
    },
    { aligned: 0, misaligned: 0, pending: 0, totalPercentage: 0, count: 0 }
  );

  const averageAlignment = alignmentStats.count > 0 
    ? (alignmentStats.totalPercentage / alignmentStats.count).toFixed(1)
    : '0';

  const summaryCards = [
    {
      title: 'Total Active',
      value: activeTransactions.length,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Aligned Stock',
      value: alignmentStats.aligned,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Misaligned Stock',
      value: alignmentStats.misaligned,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Pending Prices',
      value: alignmentStats.pending,
      icon: Clock,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                  {card.title === 'Misaligned Stock' && alignmentStats.count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: {averageAlignment}% difference
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

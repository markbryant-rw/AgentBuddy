import { TransactionListingCard } from './TransactionListingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Transaction, TransactionStage } from '@/hooks/useTransactions';

interface TransactionGridProps {
  transactions: Transaction[];
  stage: TransactionStage;
  onCardClick: (transaction: Transaction) => void;
  loading?: boolean;
  onAddTransaction?: () => void;
}

const STAGE_EMPTY_MESSAGES: Record<TransactionStage, { title: string; description: string }> = {
  signed: {
    title: 'No signed listings yet',
    description: 'Listings appear here once the agency agreement is signed',
  },
  live: {
    title: 'No live listings',
    description: 'Listings move here when they go live to market',
  },
  contract: {
    title: 'No properties under contract',
    description: 'Listings appear here when a sale agreement is signed',
  },
  unconditional: {
    title: 'No unconditional sales',
    description: 'Listings move here once all conditions are met',
  },
  settled: {
    title: 'No settled properties',
    description: 'Completed settlements appear here',
  },
};

export const TransactionGrid = ({
  transactions,
  stage,
  onCardClick,
  loading,
  onAddTransaction,
}: TransactionGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    const emptyMessage = STAGE_EMPTY_MESSAGES[stage];
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{emptyMessage.title}</h3>
            <p className="text-sm text-muted-foreground">{emptyMessage.description}</p>
          </div>
          {onAddTransaction && (
            <Button onClick={onAddTransaction} className="mt-4">
              Add Listing
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {transactions.map((transaction) => (
        <TransactionListingCard
          key={transaction.id}
          transaction={transaction}
          onClick={() => onCardClick(transaction)}
        />
      ))}
    </div>
  );
};

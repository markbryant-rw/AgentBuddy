import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TransactionKanbanCard } from './TransactionKanbanCard';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Transaction, TransactionStage } from '@/hooks/useTransactions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TransactionKanbanBoardProps {
  transactions: Transaction[];
  onCardClick: (transaction: Transaction) => void;
  onCardEdit?: (transaction: Transaction) => void;
  onAddTransaction: () => void;
  loading?: boolean;
}

const STAGE_CONFIG: Record<TransactionStage, { label: string; color: string }> = {
  signed: { label: '01. Signed', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  live: { label: '02. Live', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  contract: { label: '03. Under Contract', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  unconditional: { label: '04. Unconditional', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  settled: { label: '05. Settled', color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

const STAGES: TransactionStage[] = ['signed', 'live', 'contract', 'unconditional', 'settled'];

export const TransactionKanbanBoard = ({
  transactions,
  onCardClick,
  onCardEdit,
  onAddTransaction,
  loading,
}: TransactionKanbanBoardProps) => {
  // Group transactions by stage
  const transactionsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = transactions.filter(t => t.stage === stage && !t.archived);
    return acc;
  }, {} as Record<TransactionStage, Transaction[]>);

  if (loading) {
    return (
      <div className="flex gap-4 h-[calc(100vh-300px)]">
        {STAGES.map((stage) => (
          <div key={stage} className="flex-1 min-w-[280px]">
            <Card className="h-full p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-300px)] overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageTransactions = transactionsByStage[stage];
        const count = stageTransactions.length;

        return (
          <div key={stage} className="flex-1 min-w-[300px] max-w-[350px]">
            <Card className="h-full flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "p-4 border-b",
                stage === 'signed' && "bg-rose-50/50",
                stage === 'live' && "bg-indigo-50/50",
                stage === 'contract' && "bg-amber-50/50",
                stage === 'unconditional' && "bg-teal-50/50",
                stage === 'settled' && "bg-gray-50/50"
              )}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">{STAGE_CONFIG[stage].label}</h3>
                  <Badge variant="secondary" className={STAGE_CONFIG[stage].color}>
                    {count}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {stageTransactions.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <p className="text-sm text-muted-foreground">
                        No listings in this stage
                      </p>
                      {stage === 'signed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={onAddTransaction}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Listing
                        </Button>
                      )}
                    </div>
                  ) : (
                    stageTransactions.map((transaction) => (
                      <TransactionKanbanCard
                        key={transaction.id}
                        transaction={transaction}
                        onClick={() => onCardClick(transaction)}
                        onEdit={onCardEdit ? (e) => {
                          e.stopPropagation();
                          onCardEdit(transaction);
                        } : undefined}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

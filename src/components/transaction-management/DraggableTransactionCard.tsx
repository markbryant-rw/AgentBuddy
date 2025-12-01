import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TransactionCard } from './TransactionCard';
import { Transaction } from '@/hooks/useTransactions';

interface DraggableTransactionCardProps {
  transaction: Transaction;
  onClick: () => void;
}

export const DraggableTransactionCard = ({
  transaction,
  onClick,
}: DraggableTransactionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: transaction.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-background border rounded-md p-1 shadow-sm"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <TransactionCard
        transaction={transaction}
        onClick={onClick}
      />
    </div>
  );
};
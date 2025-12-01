import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptySlotCardProps {
  category: 'big' | 'medium' | 'little';
  onAddClick: () => void;
}

const categoryConfig = {
  big: {
    borderColor: 'border-blue-500/30',
    hoverColor: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    textColor: 'text-blue-500/50',
  },
  medium: {
    borderColor: 'border-amber-500/30',
    hoverColor: 'hover:border-amber-500/50 hover:bg-amber-500/5',
    textColor: 'text-amber-500/50',
  },
  little: {
    borderColor: 'border-green-500/30',
    hoverColor: 'hover:border-green-500/50 hover:bg-green-500/5',
    textColor: 'text-green-500/50',
  },
};

export function EmptySlotCard({ category, onAddClick }: EmptySlotCardProps) {
  const config = categoryConfig[category];

  return (
    <button
      onClick={onAddClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed bg-card/50 transition-all w-[240px] h-[140px] group",
        config.borderColor,
        config.hoverColor
      )}
    >
      <Plus className={cn("h-6 w-6 transition-transform group-hover:scale-110", config.textColor)} />
      <span className={cn("text-xs font-medium", config.textColor)}>Add Task</span>
    </button>
  );
}

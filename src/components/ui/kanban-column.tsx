import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
  getItemId: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  onAddCard?: () => void;
  addButtonText?: string;
}

export function KanbanColumn<T>({
  id,
  label,
  color,
  items,
  getItemId,
  renderItem,
  onAddCard,
  addButtonText = 'Add card',
}: KanbanColumnProps<T>) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-card rounded-lg border shadow-sm">
      {/* Column Header - Fixed */}
      <div className={cn('flex-shrink-0 p-2 border-b-2', color)}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xs">{label}</h3>
          <Badge variant="secondary" className="font-semibold text-xs px-1.5 py-0">
            {items.length}
          </Badge>
        </div>
        
        {/* Add Button - Now at the top */}
        {onAddCard && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onAddCard();
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            {addButtonText}
          </Button>
        )}
      </div>

      {/* Cards Area - Scrollable */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            'p-2 space-y-1.5 min-h-[150px]',
            isOver && 'bg-accent/50 rounded-lg'
          )}
        >
          <SortableContext
            items={items.map(getItemId)}
            strategy={verticalListSortingStrategy}
          >
            {items.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Drop items here
              </div>
            ) : (
              items.map((item) => (
                <div key={getItemId(item)}>
                  {renderItem(item)}
                </div>
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}
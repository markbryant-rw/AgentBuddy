import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BugKanbanColumnProps<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
  getItemId: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

export function BugKanbanColumn<T>({
  id,
  label,
  color,
  items,
  getItemId,
  renderItem,
}: BugKanbanColumnProps<T>) {
  return (
    <div className="flex flex-col flex-1 min-w-0 h-full bg-card rounded-lg border shadow-sm">
      {/* Column Header - Fixed */}
      <div className={cn('flex-shrink-0 p-2 border-b-2', color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs">{label}</h3>
          <Badge variant="secondary" className="font-semibold text-xs px-1.5 py-0">
            {items.length}
          </Badge>
        </div>
      </div>

      {/* Cards Area - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5 min-h-[150px]">
          {items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No bugs
            </div>
          ) : (
            items.map((item) => (
              <div key={getItemId(item)}>
                {renderItem(item)}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

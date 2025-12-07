import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FeatureKanbanColumnProps<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
  getItemId: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

export function FeatureKanbanColumn<T>({
  id,
  label,
  color,
  items,
  getItemId,
  renderItem,
}: FeatureKanbanColumnProps<T>) {
  return (
    <Card className={cn('flex-shrink-0 w-80 h-full flex flex-col border-t-4', color)}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 pr-2">
            {items.map((item) => (
              <div key={getItemId(item)}>
                {renderItem(item)}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No items
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

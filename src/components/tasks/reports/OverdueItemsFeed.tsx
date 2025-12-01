import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface OverdueItem {
  id: string;
  title: string;
  due_date: string;
  daysOverdue: number;
  severity: 'amber' | 'red';
  project_id?: string;
}

interface OverdueItemsFeedProps {
  items: OverdueItem[];
  onViewTask?: (taskId: string) => void;
}

export const OverdueItemsFeed = ({ items, onViewTask }: OverdueItemsFeedProps) => {
  if (items.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overdue Items</h3>
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No overdue items! 🎉</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        Overdue Items ({items.length})
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={item.severity === 'red' ? 'destructive' : 'secondary'}
                    className={item.severity === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                  >
                    {item.daysOverdue} day{item.daysOverdue > 1 ? 's' : ''} overdue
                  </Badge>
                </div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewTask?.(item.id)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

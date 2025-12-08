import { Card } from '@/components/ui/card';
import { Home, TrendingUp, Clock } from 'lucide-react';
import { ActivitySkeleton } from '@/components/ui/workspace-skeleton';

export const StockOverviewWidget = () => {
  // Placeholder data - will be implemented with proper queries
  const stock = { live: 0, signed: 0, total: 0 };
  const isLoading = false;

  if (isLoading) {
    return <ActivitySkeleton workspace="office-manager" />;
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Home className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Stock Overview</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <div className="text-xl font-bold">{stock.live}</div>
          <div className="text-xs text-muted-foreground">Live</div>
        </div>
        <div className="text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
          <div className="text-xl font-bold">{stock.signed}</div>
          <div className="text-xs text-muted-foreground">Signed</div>
        </div>
        <div className="text-center">
          <Home className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <div className="text-xl font-bold">{stock.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
    </Card>
  );
};

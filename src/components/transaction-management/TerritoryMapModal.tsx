import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Transaction, TransactionStage } from '@/hooks/useTransactions';
import { TerritoryMap } from './TerritoryMap';
import { useTransactionGeocoding } from '@/hooks/useTransactionGeocoding';
import { Map, MapPin, RefreshCw, Maximize2, Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STAGE_COLORS: Record<TransactionStage, string> = {
  signed: '#9b87f5',
  live: '#14b8a6',
  contract: '#f59e0b',
  unconditional: '#f97316',
  settled: '#10b981',
};

const STAGE_LABELS: Record<TransactionStage, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

interface TerritoryMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  searchQuery: string;
  onTransactionSelect: (transaction: Transaction) => void;
  onEditClick: (transaction: Transaction) => void;
}

export const TerritoryMapModal = ({
  open,
  onOpenChange,
  transactions,
  searchQuery,
  onTransactionSelect,
  onEditClick,
}: TerritoryMapModalProps) => {
  const [visibleStages, setVisibleStages] = useState<Set<TransactionStage>>(
    new Set(['signed', 'live', 'contract', 'unconditional', 'settled'])
  );
  const [showLegend, setShowLegend] = useState(true);
  const { geocodeAll, retryFailed, isGeocoding, progress } = useTransactionGeocoding();

  const stats = useMemo(() => {
    const geocoded = transactions.filter(t => t.latitude && t.longitude);
    const ungeocodedWithAddress = transactions.filter(
      t => !t.latitude && !t.longitude && t.address && !t.archived
    );
    const failed = transactions.filter(t => t.geocode_error && !t.archived);
    const suburbs = new Set(geocoded.map(t => t.suburb).filter(Boolean));

    return {
      total: transactions.length,
      geocoded: geocoded.length,
      ungeocoded: ungeocodedWithAddress.length,
      failed: failed.length,
      suburbs: suburbs.size,
    };
  }, [transactions]);

  const toggleStage = (stage: TransactionStage) => {
    setVisibleStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stage)) {
        newSet.delete(stage);
      } else {
        newSet.add(stage);
      }
      return newSet;
    });
  };

  const showAll = () => {
    setVisibleStages(new Set(['signed', 'live', 'contract', 'unconditional', 'settled']));
  };

  const hideAll = () => {
    setVisibleStages(new Set());
  };

  const handleGeocodeAll = () => {
    if (stats.ungeocoded > 10) {
      if (!confirm(`This will geocode ${stats.ungeocoded} properties. Continue?`)) {
        return;
      }
    }
    geocodeAll(transactions);
  };

  const handleRetryFailed = () => {
    retryFailed(transactions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside to avoid Leaflet cleanup issues
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Map className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-2xl">Territory Map</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {stats.geocoded} {stats.geocoded === 1 ? 'property' : 'properties'} across {stats.suburbs} {stats.suburbs === 1 ? 'suburb' : 'suburbs'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.ungeocoded > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeocodeAll}
                  disabled={isGeocoding}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Geocode {stats.ungeocoded}
                  {isGeocoding && ` (${progress.current}/${progress.total})`}
                </Button>
              )}
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryFailed}
                  disabled={isGeocoding}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry {stats.failed} Failed
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filter by stage:</span>
            <div className="flex gap-2 flex-wrap flex-1">
              {(Object.keys(STAGE_LABELS) as TransactionStage[]).map(stage => {
                const count = transactions.filter(
                  t => t.stage === stage && t.latitude && t.longitude
                ).length;
                
                return (
                  <Button
                    key={stage}
                    variant={visibleStages.has(stage) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStage(stage)}
                    className="gap-2"
                    style={
                      visibleStages.has(stage)
                        ? { backgroundColor: STAGE_COLORS[stage], borderColor: STAGE_COLORS[stage] }
                        : {}
                    }
                  >
                    {STAGE_LABELS[stage]}
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={showAll}>
                <Eye className="h-4 w-4 mr-1" />
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={hideAll}>
                <EyeOff className="h-4 w-4 mr-1" />
                None
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative px-6 pb-6">
          {stats.geocoded === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed">
              <div className="text-center space-y-4 max-w-md">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Properties to Display</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {stats.ungeocoded > 0
                      ? `${stats.ungeocoded} ${stats.ungeocoded === 1 ? 'property needs' : 'properties need'} to be geocoded before they can appear on the map.`
                      : 'Add transactions with addresses to see them on the map.'}
                  </p>
                  {stats.ungeocoded > 0 && (
                    <Button onClick={handleGeocodeAll} disabled={isGeocoding}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Geocode Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <TerritoryMap
                transactions={transactions}
                onTransactionSelect={onTransactionSelect}
                onEditClick={onEditClick}
                visibleStages={visibleStages}
                searchQuery={searchQuery}
              />

              {showLegend && (
                <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg max-w-xs z-[1000]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Legend</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLegend(false)}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(STAGE_LABELS) as TransactionStage[]).map(stage => (
                      <div key={stage} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: STAGE_COLORS[stage] }}
                        />
                        <span>{STAGE_LABELS[stage]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showLegend && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLegend(true)}
                  className="absolute bottom-4 left-4 z-[1000]"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Show Legend
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

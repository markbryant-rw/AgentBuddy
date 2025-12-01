import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { Listing } from '@/hooks/useListingPipeline';
import { OpportunityMap } from './OpportunityMap';

const WARMTH_COLORS = {
  hot: { hex: '#EF4444', bg: 'bg-red-100', text: 'text-red-600', label: '🔥 Hot' },
  warm: { hex: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-600', label: '☀️ Warm' },
  cold: { hex: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-600', label: '❄️ Cold' },
} as const;

interface OpportunityMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: Listing[];
  searchQuery?: string;
  onListingSelect?: (listing: Listing) => void;
  onEditClick?: (listing: Listing) => void;
}

export const OpportunityMapModal = ({
  open,
  onOpenChange,
  listings,
  searchQuery = '',
  onListingSelect,
  onEditClick,
}: OpportunityMapModalProps) => {
  const [visibleWarmth, setVisibleWarmth] = useState<Array<'hot' | 'warm' | 'cold'>>([
    'hot',
    'warm',
    'cold',
  ]);
  const [showLegend, setShowLegend] = useState(true);

  // Calculate geocoding statistics
  const stats = useMemo(() => {
    const geocoded = listings.filter(l => l.latitude && l.longitude).length;
    const ungeocoded = listings.filter(l => !l.latitude && !l.longitude).length;
    const failed = listings.filter(l => l.geocode_error).length;
    
    const hotCount = listings.filter(l => l.warmth === 'hot' && l.latitude && l.longitude).length;
    const warmCount = listings.filter(l => l.warmth === 'warm' && l.latitude && l.longitude).length;
    const coldCount = listings.filter(l => l.warmth === 'cold' && l.latitude && l.longitude).length;

    const suburbs = new Set(
      listings
        .filter(l => l.latitude && l.longitude && l.suburb)
        .map(l => l.suburb)
    ).size;

    return { geocoded, ungeocoded, failed, hotCount, warmCount, coldCount, suburbs };
  }, [listings]);

  const toggleWarmth = (warmth: 'hot' | 'warm' | 'cold') => {
    setVisibleWarmth(prev =>
      prev.includes(warmth)
        ? prev.filter(w => w !== warmth)
        : [...prev, warmth]
    );
  };

  const showAll = () => setVisibleWarmth(['hot', 'warm', 'cold']);
  const hideAll = () => setVisibleWarmth([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Opportunity Territory Map
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.geocoded} opportunities across {stats.suburbs} suburbs
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Warmth Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Filter by Warmth</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={showAll}
                        className="h-6 px-2 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={hideAll}
                        className="h-6 px-2 text-xs"
                      >
                        <EyeOff className="h-3 w-3 mr-1" />
                        None
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {(['hot', 'warm', 'cold'] as const).map(warmth => (
                      <button
                        key={warmth}
                        onClick={() => toggleWarmth(warmth)}
                        className={`w-full flex items-center justify-between p-2 rounded-md border transition-colors ${
                          visibleWarmth.includes(warmth)
                            ? `${WARMTH_COLORS[warmth].bg} border-current ${WARMTH_COLORS[warmth].text}`
                            : 'bg-background border-border opacity-50 hover:opacity-75'
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {WARMTH_COLORS[warmth].label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {warmth === 'hot' && stats.hotCount}
                          {warmth === 'warm' && stats.warmCount}
                          {warmth === 'cold' && stats.coldCount}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div>
                  <button
                    onClick={() => setShowLegend(!showLegend)}
                    className="flex items-center justify-between w-full mb-2"
                  >
                    <h3 className="text-sm font-medium">Legend</h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {showLegend ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </button>
                  
                  {showLegend && (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                        <span>Hot opportunities</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-amber-500" />
                        <span>Warm opportunities</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500" />
                        <span>Cold opportunities</span>
                      </div>
                      <div className="pt-2 border-t">
                        <p>Marker size indicates likelihood (1-5 stars)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="pt-4 border-t space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total opportunities:</span>
                    <span className="font-medium">{listings.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Geocoded:</span>
                    <span className="font-medium">{stats.geocoded}</span>
                  </div>
                  {stats.ungeocoded > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Pending:</span>
                      <span className="font-medium">{stats.ungeocoded}</span>
                    </div>
                  )}
                  {stats.failed > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Failed:</span>
                      <span className="font-medium">{stats.failed}</span>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {stats.geocoded === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/5">
                <div className="text-center space-y-4 max-w-md px-4">
                  <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No Geocoded Opportunities</h3>
                    <p className="text-sm text-muted-foreground">
                      Use the "Auto-Geocode" button in the main pipeline view to geocode your opportunities and see them on the map.
                    </p>
                  </div>
                </div>
              </div>
            ) : open ? (
              <OpportunityMap
                listings={listings}
                onListingSelect={onListingSelect}
                onEditClick={onEditClick}
                visibleWarmth={visibleWarmth}
                searchQuery={searchQuery}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

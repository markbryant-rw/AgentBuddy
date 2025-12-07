import { Transaction } from '@/hooks/useTransactions';
import { PastSale } from '@/hooks/usePastSales';
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, X, RefreshCw, User, DollarSign, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { GoogleMap as GoogleMapComponent, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Loader2 } from 'lucide-react';

const STAGE_COLORS: Record<string, string> = {
  signed: '#3b82f6',
  live: '#22c55e',
  contract: '#8b5cf6',
  unconditional: '#f59e0b',
  settled: '#6b7280',
};

const STAGE_OPTIONS = [
  { value: 'signed', label: 'Signed', color: 'bg-blue-500' },
  { value: 'live', label: 'Live', color: 'bg-green-500' },
  { value: 'contract', label: 'Contract', color: 'bg-purple-500' },
  { value: 'unconditional', label: 'Unconditional', color: 'bg-amber-500' },
  { value: 'settled', label: 'Settled', color: 'bg-gray-500' },
];

const WARMTH_COLORS: Record<string, string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};

// Auckland default center
const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

interface TransactMapProps {
  transactions: Transaction[];
  pastSales: PastSale[];
  onAutoGeocode?: () => void;
  isGeocoding?: boolean;
  onTransactionClick?: (transactionId: string) => void;
  onPastSaleClick?: (pastSaleId: string) => void;
}

const TransactMap = ({ transactions, pastSales, onAutoGeocode, isGeocoding, onTransactionClick, onPastSaleClick }: TransactMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const { members } = useTeamMembers();
  const [showTransactions, setShowTransactions] = useState(true);
  const [showPastSales, setShowPastSales] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  
  // Multi-select stage filter
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [transactionWarmthFilter, setTransactionWarmthFilter] = useState<string>('all');
  const [pastSalesStatusFilter, setPastSalesStatusFilter] = useState<string>('all');

  const toggleStage = (stage: string) => {
    setSelectedStages(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage)
        : [...prev, stage]
    );
  };

  // Get the first assignee from a transaction
  const getTransactionAssignee = (transaction: Transaction): string | null => {
    if (!transaction.assignees) return null;
    const assignees = transaction.assignees as any;
    if (Array.isArray(assignees) && assignees.length > 0) {
      return assignees[0];
    }
    if (assignees.primary) return assignees.primary;
    if (assignees.lead) return assignees.lead;
    return null;
  };

  // Count ungeo'd transactions
  const ungeocodedCount = useMemo(() => {
    return transactions.filter(t => !t.latitude || !t.longitude).length;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (!transaction.latitude || !transaction.longitude) return false;
      if (transaction.archived) return false;
      if (selectedStages.length > 0 && !selectedStages.includes(transaction.stage)) return false;
      if (transactionWarmthFilter !== 'all' && transaction.warmth !== transactionWarmthFilter) return false;
      
      if (salespersonFilter.length > 0) {
        const assignee = getTransactionAssignee(transaction);
        if (!assignee || !salespersonFilter.includes(assignee)) return false;
      }
      
      return true;
    });
  }, [transactions, selectedStages, transactionWarmthFilter, salespersonFilter]);

  const filteredPastSales = useMemo(() => {
    return pastSales.filter(sale => {
      if (!sale.latitude || !sale.longitude) return false;
      if (pastSalesStatusFilter !== 'all' && sale.status !== pastSalesStatusFilter) return false;
      
      if (salespersonFilter.length > 0) {
        if (!sale.agent_id || !salespersonFilter.includes(sale.agent_id)) return false;
      }
      
      return true;
    });
  }, [pastSales, pastSalesStatusFilter, salespersonFilter]);

  const getMemberById = (id: string) => members.find(m => m.id === id);

  const getStageLabel = (stage: string) => {
    return STAGE_OPTIONS.find(s => s.value === stage)?.label || stage;
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    const allCoords: { lat: number; lng: number }[] = [];
    
    if (showTransactions) {
      filteredTransactions.forEach(t => {
        if (t.latitude && t.longitude) {
          allCoords.push({ lat: t.latitude, lng: t.longitude });
        }
      });
    }
    
    if (showPastSales) {
      filteredPastSales.forEach(s => {
        if (s.latitude && s.longitude) {
          allCoords.push({ lat: s.latitude, lng: s.longitude });
        }
      });
    }
    
    if (allCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allCoords.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, 50);
    }
  }, [filteredTransactions, filteredPastSales, showTransactions, showPastSales]);

  const renderMapControls = () => (
    <div className="relative z-[1000] bg-card rounded-lg border p-3 mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input type="checkbox" checked={showTransactions} onChange={(e) => setShowTransactions(e.target.checked)} className="w-3.5 h-3.5" />
          <span>Listings ({filteredTransactions.length})</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input type="checkbox" checked={showPastSales} onChange={(e) => setShowPastSales(e.target.checked)} className="w-3.5 h-3.5" />
          <span>Past Sales ({filteredPastSales.length})</span>
        </label>

        <div className="h-5 w-px bg-border" />

        {members.length > 1 && (
          <div className="flex items-center gap-1">
            {members.map((member) => {
              const isSelected = salespersonFilter.includes(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setSalespersonFilter(prev => 
                      isSelected 
                        ? prev.filter(id => id !== member.id)
                        : [...prev, member.id]
                    );
                  }}
                  className={cn(
                    "relative transition-all rounded-full",
                    isSelected ? 'ring-2 ring-primary ring-offset-1' : 'opacity-50 hover:opacity-100'
                  )}
                  title={member.full_name || member.email}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">
                      {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              );
            })}
            {salespersonFilter.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSalespersonFilter([])} className="h-7 px-1.5 text-xs">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {onAutoGeocode && ungeocodedCount > 0 && (
          <Button onClick={onAutoGeocode} disabled={isGeocoding} size="sm" variant="outline" className="h-7 text-xs">
            <RefreshCw className={cn("h-3 w-3 mr-1", isGeocoding && "animate-spin")} />
            {isGeocoding ? 'Geocoding...' : `Geocode (${ungeocodedCount})`}
          </Button>
        )}
        
        {!isFullscreen && (
          <Button onClick={() => setIsFullscreen(true)} size="sm" variant="outline" className="h-7 text-xs">
            <Maximize2 className="h-3 w-3 mr-1" />
            Fullscreen
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showTransactions && (
          <>
            <span className="text-xs text-muted-foreground">Stages:</span>
            <div className="flex items-center gap-1">
              {STAGE_OPTIONS.map((stage) => {
                const isSelected = selectedStages.includes(stage.value);
                return (
                  <button
                    key={stage.value}
                    onClick={() => toggleStage(stage.value)}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full border transition-all",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                    )}
                  >
                    <span className={cn("inline-block w-2 h-2 rounded-full mr-1", stage.color)} />
                    {stage.label}
                  </button>
                );
              })}
              {selectedStages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStages([])} className="h-6 px-1.5 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <div className="h-4 w-px bg-border" />

            <Select value={transactionWarmthFilter} onValueChange={setTransactionWarmthFilter}>
              <SelectTrigger className="w-[110px] h-7 text-xs">
                <SelectValue placeholder="Warmth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warmth</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {showPastSales && (
          <Select value={pastSalesStatusFilter} onValueChange={setPastSalesStatusFilter}>
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  const renderTransactionInfoWindow = (transaction: Transaction) => {
    const assigneeId = getTransactionAssignee(transaction);
    const assignee = assigneeId ? getMemberById(assigneeId) : null;
    const vendorName = transaction.vendor_names?.[0] 
      ? `${transaction.vendor_names[0].first_name || ''} ${transaction.vendor_names[0].last_name || ''}`.trim()
      : null;
    const daysUntilExpiry = calculateDaysUntilExpiry(transaction.listing_expires_date);
    const expiryStatus = getExpiryStatus(daysUntilExpiry);
    const priceAlignment = calculatePriceAlignment(transaction.vendor_price, transaction.team_price);

    return (
      <div className="p-2 min-w-[220px]">
        <div className="font-bold text-sm">{transaction.address}</div>
        {transaction.suburb && <div className="text-xs text-gray-500">{transaction.suburb}</div>}
        <div className="mt-2 text-xs space-y-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">Stage:</span> {getStageLabel(transaction.stage)}
          </div>
          {assignee && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignee.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">{assignee.full_name?.split(' ').map(n => n[0]).join('') || '??'}</AvatarFallback>
              </Avatar>
              <span>{assignee.full_name}</span>
            </div>
          )}
          {vendorName && <div><span className="font-medium">Vendor:</span> {vendorName}</div>}
          {transaction.team_price && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ${(transaction.team_price / 1000).toFixed(0)}K
              {priceAlignment.status !== 'pending' && (
                <span className={priceAlignment.status === 'aligned' ? 'text-green-600' : 'text-red-600'}>
                  {priceAlignment.status === 'aligned' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                </span>
              )}
            </div>
          )}
        </div>
        <Button size="sm" className="w-full mt-2" onClick={() => onTransactionClick?.(transaction.id)}>
          View Details
        </Button>
      </div>
    );
  };

  const renderPastSaleInfoWindow = (sale: PastSale) => {
    const salesperson = members.find(m => m.id === sale.agent_id);
    
    return (
      <div className="p-2 min-w-[200px]">
        <div className="font-bold text-sm">{sale.address}</div>
        {sale.suburb && <div className="text-xs text-gray-500">{sale.suburb}</div>}
        <div className="mt-2 text-xs space-y-1">
          {salesperson && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={salesperson.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">{salesperson.full_name?.split(' ').map(n => n[0]).join('') || '??'}</AvatarFallback>
              </Avatar>
              <span>{salesperson.full_name}</span>
            </div>
          )}
          {sale.sale_price && (
            <div className="flex items-center gap-1 text-green-600 font-semibold">
              <DollarSign className="h-3 w-3" />
              ${(sale.sale_price / 1000).toFixed(0)}K
              <span className="bg-green-100 text-green-700 px-1 rounded text-[10px]">SOLD</span>
            </div>
          )}
          {sale.days_on_market && <div><span className="font-medium">DOM:</span> {sale.days_on_market} days</div>}
        </div>
        <Button size="sm" className="w-full mt-2" onClick={() => onPastSaleClick?.(sale.id)}>
          View Details
        </Button>
      </div>
    );
  };

  const renderMap = (height: string) => {
    if (loadError) {
      return (
        <div className={`flex items-center justify-center bg-muted rounded-lg`} style={{ height }}>
          <p className="text-destructive">Error loading Google Maps</p>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className={`flex items-center justify-center bg-muted rounded-lg`} style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div style={{ height }} className="rounded-lg overflow-hidden">
        <GoogleMapComponent
          mapContainerStyle={mapContainerStyle}
          center={DEFAULT_CENTER}
          zoom={11}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {showTransactions && filteredTransactions.map((transaction) => (
            <MarkerF
              key={`transaction-${transaction.id}`}
              position={{ lat: transaction.latitude!, lng: transaction.longitude! }}
              onClick={() => setSelectedMarkerId(`transaction-${transaction.id}`)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: STAGE_COLORS[transaction.stage] || STAGE_COLORS.signed,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 10,
              }}
            >
              {selectedMarkerId === `transaction-${transaction.id}` && (
                <InfoWindowF
                  position={{ lat: transaction.latitude!, lng: transaction.longitude! }}
                  onCloseClick={() => setSelectedMarkerId(null)}
                >
                  {renderTransactionInfoWindow(transaction)}
                </InfoWindowF>
              )}
            </MarkerF>
          ))}

          {showPastSales && filteredPastSales.map((sale) => (
            <MarkerF
              key={`sale-${sale.id}`}
              position={{ lat: sale.latitude!, lng: sale.longitude! }}
              onClick={() => setSelectedMarkerId(`sale-${sale.id}`)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#22c55e',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8,
              }}
            >
              {selectedMarkerId === `sale-${sale.id}` && (
                <InfoWindowF
                  position={{ lat: sale.latitude!, lng: sale.longitude! }}
                  onCloseClick={() => setSelectedMarkerId(null)}
                >
                  {renderPastSaleInfoWindow(sale)}
                </InfoWindowF>
              )}
            </MarkerF>
          ))}
        </GoogleMapComponent>
      </div>
    );
  };

  return (
    <div>
      {renderMapControls()}
      {renderMap('500px')}

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-4">
          <DialogHeader>
            <DialogTitle>Territory Map</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {renderMapControls()}
            {renderMap('calc(90vh - 140px)')}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactMap;

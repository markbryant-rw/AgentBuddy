import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip, useMap } from 'react-leaflet';
import { Transaction } from '@/hooks/useTransactions';
import { PastSale } from '@/hooks/usePastSales';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, X, RefreshCw } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const WARMTH_COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};

interface FitBoundsProps {
  items: any[];
}

const FitBounds = ({ items }: FitBoundsProps) => {
  const map = useMap();

  useEffect(() => {
    const allCoords: [number, number][] = [];
    
    items
      .filter(item => item.latitude && item.longitude)
      .forEach(item => allCoords.push([item.latitude!, item.longitude!]));

    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    } else {
      map.setView([-36.8485, 174.7633], 11);
    }
  }, [items, map]);

  return null;
};

interface TransactMapProps {
  transactions: Transaction[];
  pastSales: PastSale[];
  onAutoGeocode?: () => void;
  isGeocoding?: boolean;
}

// Helper to create avatar icon for map markers
const createAvatarIcon = (avatarUrl: string | null, name: string, borderColor: string) => {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const bgColor = avatarUrl ? 'transparent' : '#6366f1';
  
  return L.divIcon({
    className: 'custom-avatar-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 3px solid ${borderColor};
        overflow: hidden;
        background: ${bgColor};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${avatarUrl 
          ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
          : `<span style="color: white; font-size: 12px; font-weight: 600;">${initials}</span>`
        }
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const TransactMap = ({ transactions, pastSales, onAutoGeocode, isGeocoding }: TransactMapProps) => {
  const { members } = useTeamMembers();
  const [showTransactions, setShowTransactions] = useState(true);
  const [showPastSales, setShowPastSales] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
  
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

  const getRadiusByWarmth = (warmth: string) => {
    switch (warmth) {
      case 'hot': return 12;
      case 'warm': return 9;
      case 'cold': return 6;
      default: return 8;
    }
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
      // Multi-select stage filter
      if (selectedStages.length > 0 && !selectedStages.includes(transaction.stage)) return false;
      if (transactionWarmthFilter !== 'all' && transaction.warmth !== transactionWarmthFilter) return false;
      
      // Salesperson filter
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
      
      // Salesperson filter
      if (salespersonFilter.length > 0) {
        if (!sale.lead_salesperson || !salespersonFilter.includes(sale.lead_salesperson)) return false;
      }
      
      return true;
    });
  }, [pastSales, pastSalesStatusFilter, salespersonFilter]);

  const showAvatars = salespersonFilter.length > 0;

  // Get member info by ID
  const getMemberById = (id: string) => members.find(m => m.id === id);

  const renderMapControls = () => (
    <div className="relative z-[1000] bg-card rounded-lg border p-3 mb-3 space-y-2">
      {/* Row 1: Main toggles, avatars, actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Show/Hide toggles */}
        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input type="checkbox" checked={showTransactions} onChange={(e) => setShowTransactions(e.target.checked)} className="w-3.5 h-3.5" />
          <span>Listings ({filteredTransactions.length})</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
          <input type="checkbox" checked={showPastSales} onChange={(e) => setShowPastSales(e.target.checked)} className="w-3.5 h-3.5" />
          <span>Past Sales ({filteredPastSales.length})</span>
        </label>

        <div className="h-5 w-px bg-border" />

        {/* Salesperson avatars */}
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

        {/* Actions */}
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

      {/* Row 2: Stage filters + dropdowns */}
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

  const getStageLabel = (stage: string) => {
    return STAGE_OPTIONS.find(s => s.value === stage)?.label || stage;
  };

  const renderTransactionPopup = (transaction: Transaction) => {
    const stageColor = STAGE_COLORS[transaction.stage] || '#6b7280';
    const vendorName = transaction.vendor_names?.[0] 
      ? `${transaction.vendor_names[0].first_name || ''} ${transaction.vendor_names[0].last_name || ''}`.trim()
      : null;

    return (
      <Popup>
        <div className="min-w-[200px] p-1">
          {/* Address & Suburb */}
          <div className="flex items-start gap-2 mb-2">
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: stageColor }} />
            <div>
              <p className="font-semibold text-sm leading-tight">{transaction.address}</p>
              {transaction.suburb && (
                <p className="text-xs text-gray-500">{transaction.suburb}</p>
              )}
            </div>
          </div>
          
          {/* Stage Badge */}
          <div className="mb-2">
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: stageColor }}
            >
              {getStageLabel(transaction.stage)}
            </span>
            {transaction.warmth && (
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ml-1"
                style={{ backgroundColor: WARMTH_COLORS[transaction.warmth as keyof typeof WARMTH_COLORS] || '#6b7280' }}
              >
                {transaction.warmth}
              </span>
            )}
          </div>

          {/* Vendor */}
          {vendorName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{vendorName}</span>
            </div>
          )}

          {/* Price */}
          {transaction.team_price && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">${transaction.team_price.toLocaleString()}</span>
            </div>
          )}

        </div>
      </Popup>
    );
  };

  const renderTransactionMarker = (transaction: Transaction) => {
    const assigneeId = getTransactionAssignee(transaction);
    const member = assigneeId ? getMemberById(assigneeId) : null;
    const stageColor = STAGE_COLORS[transaction.stage] || '#6b7280';

    if (showAvatars && member) {
      const icon = createAvatarIcon(member.avatar_url, member.full_name || '', stageColor);
      return (
        <Marker
          key={`transaction-${transaction.id}`}
          position={[transaction.latitude!, transaction.longitude!]}
          icon={icon}
        >
          <Tooltip 
            direction="top" 
            offset={[0, -20]} 
            className="!bg-card !text-foreground !border-border !rounded-md !px-2 !py-1 !text-xs !font-medium !shadow-lg"
          >
            {transaction.address}
          </Tooltip>
          {renderTransactionPopup(transaction)}
        </Marker>
      );
    }

    return (
      <CircleMarker
        key={`transaction-${transaction.id}`}
        center={[transaction.latitude!, transaction.longitude!]}
        radius={getRadiusByWarmth(transaction.warmth)}
        pathOptions={{
          fillColor: stageColor,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        }}
      >
        <Tooltip 
          direction="top" 
          offset={[0, -5]} 
          className="!bg-card !text-foreground !border-border !rounded-md !px-2 !py-1 !text-xs !font-medium !shadow-lg"
        >
          {transaction.address}
        </Tooltip>
        {renderTransactionPopup(transaction)}
      </CircleMarker>
    );
  };

  const renderPastSalePopup = (sale: PastSale) => {
    const isSold = sale.status === 'sold' || sale.status === 'won_and_sold';
    const statusColor = isSold ? '#22c55e' : '#ef4444';
    const vendorName = sale.vendor_details?.primary 
      ? `${sale.vendor_details.primary.first_name || ''} ${sale.vendor_details.primary.last_name || ''}`.trim()
      : null;

    return (
      <Popup>
        <div className="min-w-[200px] p-1">
          {/* Address & Suburb */}
          <div className="flex items-start gap-2 mb-2">
            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: statusColor }} />
            <div>
              <p className="font-semibold text-sm leading-tight">{sale.address}</p>
              {sale.suburb && (
                <p className="text-xs text-gray-500">{sale.suburb}</p>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="mb-2">
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white capitalize"
              style={{ backgroundColor: statusColor }}
            >
              {isSold ? 'Sold' : sale.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>

          {/* Vendor */}
          {vendorName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{vendorName}</span>
            </div>
          )}

          {/* Sale Price */}
          {sale.sale_price && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">${sale.sale_price.toLocaleString()}</span>
            </div>
          )}

          {/* Settlement Date */}
          {sale.settlement_date && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Settled {new Date(sale.settlement_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </Popup>
    );
  };

  const renderPastSaleMarker = (sale: PastSale) => {
    const member = sale.lead_salesperson ? getMemberById(sale.lead_salesperson) : null;
    const statusColor = sale.status === 'sold' || sale.status === 'won_and_sold' ? '#22c55e' : '#ef4444';

    if (showAvatars && member) {
      const icon = createAvatarIcon(member.avatar_url, member.full_name || '', statusColor);
      return (
        <Marker
          key={`sale-${sale.id}`}
          position={[sale.latitude!, sale.longitude!]}
          icon={icon}
        >
          <Tooltip 
            direction="top" 
            offset={[0, -20]} 
            className="!bg-card !text-foreground !border-border !rounded-md !px-2 !py-1 !text-xs !font-medium !shadow-lg"
          >
            {sale.address}
          </Tooltip>
          {renderPastSalePopup(sale)}
        </Marker>
      );
    }

    return (
      <CircleMarker
        key={`sale-${sale.id}`}
        center={[sale.latitude!, sale.longitude!]}
        radius={8}
        pathOptions={{
          fillColor: statusColor,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.6,
        }}
      >
        <Tooltip 
          direction="top" 
          offset={[0, -5]} 
          className="!bg-card !text-foreground !border-border !rounded-md !px-2 !py-1 !text-xs !font-medium !shadow-lg"
        >
          {sale.address}
        </Tooltip>
        {renderPastSalePopup(sale)}
      </CircleMarker>
    );
  };

  const renderMap = () => (
    <div className="h-[600px] rounded-lg overflow-hidden border">
      <MapContainer
        center={[-36.8485, 174.7633]}
        zoom={11}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds items={[...filteredTransactions, ...filteredPastSales]} />
        
        {showTransactions && filteredTransactions.map(renderTransactionMarker)}
        {showPastSales && filteredPastSales.map(renderPastSaleMarker)}
      </MapContainer>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {renderMapControls()}
        {renderMap()}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>Transact Map - Fullscreen</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {renderMapControls()}
            <div className="h-[calc(95vh-200px)] rounded-lg overflow-hidden border">
              <MapContainer
                center={[-36.8485, 174.7633]}
                zoom={11}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <FitBounds items={[...filteredTransactions, ...filteredPastSales]} />
                
                {showTransactions && filteredTransactions.map(renderTransactionMarker)}
                {showPastSales && filteredPastSales.map(renderPastSaleMarker)}
              </MapContainer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactMap;

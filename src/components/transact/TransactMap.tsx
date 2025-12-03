import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import { Transaction } from '@/hooks/useTransactions';
import { PastSale } from '@/hooks/usePastSales';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, X } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STAGE_COLORS = {
  signed: '#3b82f6',
  under_contract: '#8b5cf6',
  unconditional: '#f59e0b',
  settled: '#22c55e',
};

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
  onTransactionClick?: (transaction: Transaction) => void;
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

const TransactMap = ({ transactions, pastSales, onTransactionClick, onAutoGeocode, isGeocoding }: TransactMapProps) => {
  const { members } = useTeamMembers();
  const [showTransactions, setShowTransactions] = useState(true);
  const [showPastSales, setShowPastSales] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
  
  const [transactionStageFilter, setTransactionStageFilter] = useState<string>('all');
  const [transactionWarmthFilter, setTransactionWarmthFilter] = useState<string>('all');
  const [pastSalesStatusFilter, setPastSalesStatusFilter] = useState<string>('all');

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
    // Handle both array and object formats
    if (Array.isArray(assignees) && assignees.length > 0) {
      return assignees[0];
    }
    if (assignees.primary) return assignees.primary;
    if (assignees.lead) return assignees.lead;
    return null;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (!transaction.latitude || !transaction.longitude) return false;
      if (transaction.archived) return false;
      if (transactionStageFilter !== 'all' && transaction.stage !== transactionStageFilter) return false;
      if (transactionWarmthFilter !== 'all' && transaction.warmth !== transactionWarmthFilter) return false;
      
      // Salesperson filter
      if (salespersonFilter.length > 0) {
        const assignee = getTransactionAssignee(transaction);
        if (!assignee || !salespersonFilter.includes(assignee)) return false;
      }
      
      return true;
    });
  }, [transactions, transactionStageFilter, transactionWarmthFilter, salespersonFilter]);

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

  const renderSalespersonFilter = () => {
    if (members.length <= 1) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Filter by:</span>
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
              className={`relative transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-full' : 'opacity-60 hover:opacity-100'}`}
              title={member.full_name || member.email}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
            </button>
          );
        })}
        {salespersonFilter.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSalespersonFilter([])}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    );
  };

  const renderMapControls = () => (
    <div className="relative z-[1000] bg-card rounded-lg border p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showTransactions} onChange={(e) => setShowTransactions(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Show Current Listings ({filteredTransactions.length})</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showPastSales} onChange={(e) => setShowPastSales(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Show Past Sales ({filteredPastSales.length})</span>
        </label>
        
        {onAutoGeocode && (
          <Button onClick={onAutoGeocode} disabled={isGeocoding} size="sm" variant="outline">
            {isGeocoding ? 'Geocoding...' : 'Auto-Geocode All'}
          </Button>
        )}
        
        {!isFullscreen && (
          <Button onClick={() => setIsFullscreen(true)} size="sm" variant="outline" className="ml-auto">
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        )}
      </div>

      {/* Salesperson Filter */}
      {renderSalespersonFilter()}

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3">
        {showTransactions && (
          <>
            <Select value={transactionStageFilter} onValueChange={setTransactionStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transaction Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="unconditional">Unconditional</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={transactionWarmthFilter} onValueChange={setTransactionWarmthFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transaction Warmth" />
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Past Sales Status" />
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

  const renderTransactionMarker = (transaction: Transaction) => {
    const assigneeId = getTransactionAssignee(transaction);
    const member = assigneeId ? getMemberById(assigneeId) : null;
    const stageColor = STAGE_COLORS[transaction.stage as keyof typeof STAGE_COLORS] || '#gray';

    if (showAvatars && member) {
      const icon = createAvatarIcon(member.avatar_url, member.full_name || '', stageColor);
      return (
        <Marker
          key={`transaction-${transaction.id}`}
          position={[transaction.latitude!, transaction.longitude!]}
          icon={icon}
          eventHandlers={{
            click: () => onTransactionClick?.(transaction),
          }}
        >
          <Popup>
            <div className="p-2">
              <p className="font-semibold">{transaction.address}</p>
              <p className="text-sm text-muted-foreground">
                Vendor: {transaction.vendor_names?.[0]?.first_name} {transaction.vendor_names?.[0]?.last_name}
              </p>
              <p className="text-sm">Stage: <span className="font-medium capitalize">{transaction.stage.replace('_', ' ')}</span></p>
              <p className="text-sm">Warmth: <span className="font-medium capitalize">{transaction.warmth}</span></p>
              {transaction.team_price && (
                <p className="text-sm">Price: ${transaction.team_price.toLocaleString()}</p>
              )}
            </div>
          </Popup>
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
        eventHandlers={{
          click: () => onTransactionClick?.(transaction),
        }}
      >
        <Popup>
          <div className="p-2">
            <p className="font-semibold">{transaction.address}</p>
            <p className="text-sm text-muted-foreground">
              Vendor: {transaction.vendor_names?.[0]?.first_name} {transaction.vendor_names?.[0]?.last_name}
            </p>
            <p className="text-sm">Stage: <span className="font-medium capitalize">{transaction.stage.replace('_', ' ')}</span></p>
            <p className="text-sm">Warmth: <span className="font-medium capitalize">{transaction.warmth}</span></p>
            {transaction.team_price && (
              <p className="text-sm">Price: ${transaction.team_price.toLocaleString()}</p>
            )}
          </div>
        </Popup>
      </CircleMarker>
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
          <Popup>
            <div className="p-2">
              <p className="font-semibold">{sale.address}</p>
              <p className="text-sm text-muted-foreground">
                Vendor: {sale.vendor_details?.primary?.first_name} {sale.vendor_details?.primary?.last_name}
              </p>
              {sale.sale_price && (
                <p className="text-sm">Sold: ${sale.sale_price.toLocaleString()}</p>
              )}
              {sale.settlement_date && (
                <p className="text-sm">Settled: {new Date(sale.settlement_date).toLocaleDateString()}</p>
              )}
            </div>
          </Popup>
        </Marker>
      );
    }

    return (
      <CircleMarker
        key={`sale-${sale.id}`}
        center={[sale.latitude!, sale.longitude!]}
        radius={8}
        pathOptions={{
          fillColor: '#22c55e',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.6,
        }}
      >
        <Popup>
          <div className="p-2">
            <p className="font-semibold">{sale.address}</p>
            <p className="text-sm text-muted-foreground">
              Vendor: {sale.vendor_details?.primary?.first_name} {sale.vendor_details?.primary?.last_name}
            </p>
            {sale.sale_price && (
              <p className="text-sm">Sold: ${sale.sale_price.toLocaleString()}</p>
            )}
            {sale.settlement_date && (
              <p className="text-sm">Settled: {new Date(sale.settlement_date).toLocaleDateString()}</p>
            )}
          </div>
        </Popup>
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
      <div className="space-y-4">
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

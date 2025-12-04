import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Tooltip, useMap } from 'react-leaflet';
import { Transaction } from '@/hooks/useTransactions';
import { PastSale } from '@/hooks/usePastSales';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, X, RefreshCw, User, DollarSign, Calendar, CheckCircle, AlertTriangle, Clock, ListTodo } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';
import { calculatePriceAlignment } from '@/lib/priceAlignmentUtils';
import { differenceInDays, parseISO, format } from 'date-fns';
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

  // Stage gradients for header bands
  const STAGE_GRADIENTS: Record<string, string> = {
    signed: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    live: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
    contract: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    unconditional: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    settled: 'linear-gradient(135deg, #6b7280 0%, #71717a 100%)',
  };

  const renderTransactionPopup = (transaction: Transaction) => {
    const assigneeId = getTransactionAssignee(transaction);
    const assignee = assigneeId ? getMemberById(assigneeId) : null;
    
    const vendorName = transaction.vendor_names?.[0] 
      ? `${transaction.vendor_names[0].first_name || ''} ${transaction.vendor_names[0].last_name || ''}`.trim()
      : null;
    
    // Calculate Days on Market
    const daysOnMarket = transaction.live_date 
      ? differenceInDays(new Date(), parseISO(transaction.live_date))
      : null;
    
    // Calculate price alignment
    const priceAlignment = calculatePriceAlignment(transaction.vendor_price, transaction.team_price);
    const hasTaskProgress = transaction.tasks_total > 0;
    const taskPercentage = hasTaskProgress ? Math.round((transaction.tasks_done / transaction.tasks_total) * 100) : 0;
    
    const priceDelta = transaction.vendor_price && transaction.team_price 
      ? transaction.vendor_price - transaction.team_price 
      : null;

    const stageGradient = STAGE_GRADIENTS[transaction.stage] || STAGE_GRADIENTS.signed;

    return (
      <Popup>
        <div className="w-[320px] overflow-hidden">
          {/* Colored Header Band */}
          <div 
            className="px-4 py-3 text-white"
            style={{ background: stageGradient }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-base leading-tight truncate">{transaction.address}</h3>
                {transaction.suburb && (
                  <p className="text-white/80 text-sm mt-0.5">{transaction.suburb}</p>
                )}
              </div>
              <span className="flex-shrink-0 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-semibold uppercase">
                {getStageLabel(transaction.stage)}
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="bg-card p-4">
            {/* Salesperson Card */}
            {assignee && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={assignee.avatar_url || ''} />
                  <AvatarFallback className="text-sm bg-primary text-primary-foreground font-semibold">
                    {assignee.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{assignee.full_name}</p>
                  <p className="text-xs text-muted-foreground">Lead Salesperson</p>
                </div>
              </div>
            )}

            {/* Vendor & Price Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Vendor Card */}
              {vendorName && (
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide font-medium">Vendor</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{vendorName}</p>
                </div>
              )}
              
              {/* Team Price Card */}
              {transaction.team_price && (
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase tracking-wide font-medium">Team Price</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">${transaction.team_price.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Price Alignment Section */}
            {priceAlignment.status !== 'pending' && (
              <div className={cn(
                "mb-4 p-3 rounded-xl border",
                priceAlignment.status === 'aligned' 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
                  : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {priceAlignment.status === 'aligned' ? (
                      <div className="p-1 rounded-full bg-green-500">
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-full bg-red-500">
                        <AlertTriangle className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      priceAlignment.status === 'aligned' ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                    )}>
                      {priceAlignment.status === 'aligned' ? 'Price Aligned' : 'Price Gap'}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    priceAlignment.status === 'aligned' 
                      ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300" 
                      : "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300"
                  )}>
                    {priceAlignment.percentage}% diff
                  </span>
                </div>
                
                {/* Progress bar visualization */}
                <div className="h-2 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden mb-2">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      priceAlignment.status === 'aligned' ? "bg-green-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(100, 100 - priceAlignment.percentage)}%` }}
                  />
                </div>
                
                {priceDelta !== null && transaction.vendor_price && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Vendor: ${transaction.vendor_price.toLocaleString()}</span>
                    <span className={cn(
                      "font-medium",
                      priceDelta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {priceDelta > 0 ? '+' : ''}${priceDelta.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Stats Row - Mini Cards */}
            <div className="grid grid-cols-3 gap-2">
              {daysOnMarket !== null && daysOnMarket >= 0 && (
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{daysOnMarket}</p>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">DOM</p>
                </div>
              )}
              
              {transaction.expected_settlement && (
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-0.5">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{format(parseISO(transaction.expected_settlement), 'MMM d')}</p>
                  <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wide">Settle</p>
                </div>
              )}
              
              {hasTaskProgress && (
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-0.5">
                    <ListTodo className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{transaction.tasks_done}/{transaction.tasks_total}</p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">Tasks</p>
                </div>
              )}
            </div>

            {/* Task Progress Bar */}
            {hasTaskProgress && (
              <div className="mt-3">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      taskPercentage === 100 ? "bg-green-500" : "bg-amber-500"
                    )}
                    style={{ width: `${taskPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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
    const salesperson = sale.lead_salesperson ? getMemberById(sale.lead_salesperson) : null;
    
    const vendorName = sale.vendor_details?.primary 
      ? `${sale.vendor_details.primary.first_name || ''} ${sale.vendor_details.primary.last_name || ''}`.trim()
      : null;
    
    // Calculate Days on Market
    const daysOnMarket = sale.days_on_market ?? (
      sale.listing_live_date && sale.unconditional_date
        ? differenceInDays(parseISO(sale.unconditional_date), parseISO(sale.listing_live_date))
        : null
    );

    const statusGradient = isSold 
      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

    return (
      <Popup>
        <div className="w-[320px] overflow-hidden">
          {/* Colored Header Band */}
          <div 
            className="px-4 py-3 text-white"
            style={{ background: statusGradient }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-base leading-tight truncate">{sale.address}</h3>
                {sale.suburb && (
                  <p className="text-white/80 text-sm mt-0.5">{sale.suburb}</p>
                )}
              </div>
              <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-semibold uppercase">
                {isSold && <CheckCircle className="h-3 w-3" />}
                {isSold ? 'SOLD' : sale.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="bg-card p-4">
            {/* Salesperson Card */}
            {salesperson && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
                <Avatar className="h-10 w-10 ring-2 ring-green-500/20">
                  <AvatarImage src={salesperson.avatar_url || ''} />
                  <AvatarFallback className="text-sm bg-green-600 text-white font-semibold">
                    {salesperson.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{salesperson.full_name}</p>
                  <p className="text-xs text-muted-foreground">Lead Salesperson</p>
                </div>
              </div>
            )}

            {/* Vendor Card */}
            {vendorName && (
              <div className="mb-4 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">Vendor</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{vendorName}</p>
              </div>
            )}

            {/* Sale Price Feature Card */}
            {sale.sale_price && (
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200 dark:border-green-900 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="p-1.5 rounded-full bg-green-500">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  ${sale.sale_price.toLocaleString()}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 uppercase tracking-wide mt-1">Final Sale Price</p>
              </div>
            )}

            {/* Stats Row - Mini Cards */}
            <div className="grid grid-cols-2 gap-2">
              {daysOnMarket !== null && daysOnMarket >= 0 && (
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{daysOnMarket}</p>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wide">Days on Market</p>
                </div>
              )}
              
              {sale.settlement_date && (
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-0.5">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{format(parseISO(sale.settlement_date), 'MMM d')}</p>
                  <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wide">Settled</p>
                </div>
              )}
            </div>
          </div>
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

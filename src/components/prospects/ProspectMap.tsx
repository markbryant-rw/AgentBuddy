import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Maximize2, User } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import L from 'leaflet';
import ReactDOMServer from 'react-dom/server';
import 'leaflet/dist/leaflet.css';

const WARMTH_COLORS = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};

const INTENT_COLORS = {
  high: '#ef4444',   // Red
  medium: '#f59e0b', // Orange
  low: '#3b82f6',    // Blue
};

const OUTCOME_COLORS = {
  won: '#22c55e',
  lost: '#6b7280',
};

interface FitBoundsProps {
  listings: any[];
}

const FitBounds = ({ listings }: FitBoundsProps) => {
  const map = useMap();

  useEffect(() => {
    const allCoords: [number, number][] = [];
    
    listings
      .filter(item => item.latitude && item.longitude)
      .forEach(item => allCoords.push([item.latitude!, item.longitude!]));

    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    } else {
      map.setView([-36.8485, 174.7633], 11);
    }
  }, [listings, map]);

  return null;
};

interface ProspectMapProps {
  appraisals: LoggedAppraisal[];
  opportunities: Listing[];
  onAppraisalClick?: (appraisal: LoggedAppraisal) => void;
  onAutoGeocode?: () => void;
  isGeocoding?: boolean;
}

const ProspectMap = ({ appraisals, opportunities, onAppraisalClick, onAutoGeocode, isGeocoding }: ProspectMapProps) => {
  const { members: teamMembers } = useTeamMembers();
  const [showAppraisals, setShowAppraisals] = useState(true);
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Unified filters for both appraisals and opportunities
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [warmthFilter, setWarmthFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);

  const getRadiusByIntent = (intent: string) => {
    switch (intent) {
      case 'high': return 12;
      case 'medium': return 9;
      case 'low': return 6;
      default: return 8;
    }
  };

  const getRadiusByWarmth = (warmth: string) => {
    switch (warmth) {
      case 'hot': return 12;
      case 'warm': return 9;
      case 'cold': return 6;
      default: return 8;
    }
  };

  const filteredAppraisals = useMemo(() => {
    return appraisals.filter(appraisal => {
      if (!appraisal.latitude || !appraisal.longitude) return false;
      if (intentFilter !== 'all' && appraisal.intent !== intentFilter) return false;
      if (outcomeFilter !== 'all' && (appraisal as any).outcome !== outcomeFilter) return false;
      if (salespersonFilter.length > 0 && !salespersonFilter.includes(appraisal.created_by)) return false;
      return true;
    });
  }, [appraisals, intentFilter, outcomeFilter, salespersonFilter]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      if (!opp.latitude || !opp.longitude) return false;
      if (stageFilter !== 'all' && opp.stage !== stageFilter) return false;
      if (warmthFilter !== 'all' && opp.warmth !== warmthFilter) return false;
      if (outcomeFilter !== 'all' && (opp as any).outcome !== outcomeFilter) return false;
      if (salespersonFilter.length > 0 && opp.assigned_to && !salespersonFilter.includes(opp.assigned_to)) return false;
      return true;
    });
  }, [opportunities, stageFilter, warmthFilter, outcomeFilter, salespersonFilter]);

  const renderMapControls = () => (
    <div className="relative z-[1000] bg-card rounded-lg border p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAppraisals} onChange={(e) => setShowAppraisals(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Show Appraisals ({filteredAppraisals.length})</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showOpportunities} onChange={(e) => setShowOpportunities(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Show Opportunities ({filteredOpportunities.length})</span>
        </label>
        <div className="ml-auto flex gap-2">
          {onAutoGeocode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAutoGeocode}
              disabled={isGeocoding}
            >
              {isGeocoding ? 'Geocoding...' : 'Auto-Geocode All'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="h-4 w-4 mr-2" />Fullscreen
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Intent Filter (Appraisals) */}
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Intent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Unified Stage Filter (Opportunities) */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="vap">VAP</SelectItem>
            <SelectItem value="map">MAP</SelectItem>
            <SelectItem value="lap">LAP</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Unified Warmth Filter (Opportunities) */}
        <Select value={warmthFilter} onValueChange={setWarmthFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Warmth" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warmth</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>

        {/* Unified Outcome Filter */}
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Outcomes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="won">WON</SelectItem>
            <SelectItem value="lost">LOST</SelectItem>
          </SelectContent>
        </Select>

        {/* Salesperson Filter */}
        <TooltipProvider>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Salesperson:</span>
            <div className="flex items-center gap-1">
              {teamMembers.map((member) => {
                const isSelected = salespersonFilter.includes(member.user_id);
                return (
                  <Tooltip key={member.user_id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSalespersonFilter(prev => 
                            prev.includes(member.user_id)
                              ? prev.filter(id => id !== member.user_id)
                              : [...prev, member.user_id]
                          );
                        }}
                        className={`transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.full_name || member.email}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
        {/* Legend - Updated for Appraisals (Intent) and Opportunities (Warmth) */}
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground">Appraisals (Intent):</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.high }} /><span className="text-xs">High</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.medium }} /><span className="text-xs">Medium</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.low }} /><span className="text-xs">Low</span></div>
          <div className="w-px h-4 bg-border mx-1"></div>
          <span className="text-xs text-muted-foreground">Opportunities (Warmth):</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: WARMTH_COLORS.hot }} /><span className="text-xs">Hot</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: WARMTH_COLORS.warm }} /><span className="text-xs">Warm</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: WARMTH_COLORS.cold }} /><span className="text-xs">Cold</span></div>
          <div className="w-px h-4 bg-border mx-1"></div>
          <span className="text-xs text-muted-foreground">Outcome:</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: OUTCOME_COLORS.won }} /><span className="text-xs">WON</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: OUTCOME_COLORS.lost }} /><span className="text-xs">LOST</span></div>
        </div>
      </div>
    </div>
  );

  const renderMap = (height: string) => {
    // Determine if we should show avatars (when specific salespeople are selected)
    const showAvatars = salespersonFilter.length > 0;

    // Helper to get color based on outcome, intent (appraisals), or warmth (opportunities)
    const getMarkerColor = (item: any, isAppraisal: boolean = false) => {
      const outcome = item.outcome;
      if (outcome === 'won') return OUTCOME_COLORS.won;
      if (outcome === 'lost') return OUTCOME_COLORS.lost;
      
      if (isAppraisal && item.intent) {
        return INTENT_COLORS[item.intent as keyof typeof INTENT_COLORS];
      }
      
      return WARMTH_COLORS[item.warmth as keyof typeof WARMTH_COLORS] || WARMTH_COLORS.cold;
    };

    // Helper to create avatar marker icon
    const createAvatarIcon = (salesperson: any, item: any, isAppraisal: boolean = false) => {
      const borderColor = getMarkerColor(item, isAppraisal);
      const initials = salesperson.full_name?.split(' ').map((n: string) => n[0]).join('') || '?';
      
      const avatarHtml = salesperson.avatar_url 
        ? `<img src="${salesperson.avatar_url}" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full flex items-center justify-center bg-muted text-xs font-semibold">${initials}</div>`;
      
      return L.divIcon({
        className: 'custom-avatar-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid ${borderColor};
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            ${avatarHtml}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    };

    return (
      <MapContainer center={[-36.8485, 174.7633]} zoom={11} className={`${height} w-full`}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {showAppraisals && filteredAppraisals.map((appraisal) => {
          const salesperson = teamMembers.find(m => m.user_id === appraisal.created_by);
          const markerColor = getMarkerColor(appraisal);
          
          if (showAvatars && salesperson) {
            // Show avatar marker when salesperson filter is active
            return (
              <Marker
                key={`appraisal-${appraisal.id}`}
                position={[appraisal.latitude!, appraisal.longitude!]}
                icon={createAvatarIcon(salesperson, appraisal)}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={salesperson.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {salesperson.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{appraisal.address}</p>
                        <p className="text-xs text-muted-foreground">{salesperson.full_name || salesperson.email}</p>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">Vendor:</span> {appraisal.vendor_name}</p>
                      <p><span className="font-medium">Intent:</span> {appraisal.intent}</p>
                      <p><span className="font-medium">Stage:</span> {appraisal.stage}</p>
                      <p><span className="font-medium">Outcome:</span> {appraisal.outcome}</p>
                    </div>
                    {onAppraisalClick && <Button size="sm" onClick={() => onAppraisalClick(appraisal)} className="w-full mt-2">View Details</Button>}
                  </div>
                </Popup>
              </Marker>
            );
          }
          
          // Show colored dot based on outcome or warmth
          return (
            <CircleMarker 
              key={`appraisal-${appraisal.id}`} 
              center={[appraisal.latitude!, appraisal.longitude!]} 
              radius={getRadiusByIntent(appraisal.intent)}
              pathOptions={{ fillColor: markerColor, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.7 }}
            >
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-sm">{appraisal.address}</p>
                    <p className="text-xs text-muted-foreground">{appraisal.vendor_name}</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Intent:</span> {appraisal.intent}</p>
                    <p><span className="font-medium">Stage:</span> {appraisal.stage}</p>
                    <p><span className="font-medium">Outcome:</span> {appraisal.outcome}</p>
                    {salesperson && (
                      <div className="flex items-center gap-2 pt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={salesperson.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {salesperson.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{salesperson.full_name || salesperson.email}</span>
                      </div>
                    )}
                  </div>
                  {onAppraisalClick && <Button size="sm" onClick={() => onAppraisalClick(appraisal)} className="w-full mt-2">View Details</Button>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        {showOpportunities && filteredOpportunities.map((opportunity) => {
          const markerColor = getMarkerColor(opportunity);
          const salesperson = teamMembers.find(m => m.user_id === opportunity.assigned_to);
          
          if (showAvatars && salesperson) {
            // Show avatar marker when salesperson filter is active
            return (
              <Marker
                key={`opportunity-${opportunity.id}`}
                position={[opportunity.latitude!, opportunity.longitude!]}
                icon={createAvatarIcon(salesperson, opportunity)}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={salesperson.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {salesperson.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{opportunity.address}</p>
                        <p className="text-xs text-muted-foreground">{salesperson.full_name || salesperson.email}</p>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">Vendor:</span> {opportunity.vendor_name}</p>
                      <p><span className="font-medium">Stage:</span> {opportunity.stage?.toUpperCase()}</p>
                      <p><span className="font-medium">Warmth:</span> {opportunity.warmth}</p>
                      {opportunity.estimated_value && <p><span className="font-medium">Value:</span> ${opportunity.estimated_value.toLocaleString()}</p>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }
          
          // Show colored dot based on outcome or warmth
          return (
            <CircleMarker 
              key={`opportunity-${opportunity.id}`} 
              center={[opportunity.latitude!, opportunity.longitude!]} 
              radius={getRadiusByWarmth(opportunity.warmth)}
              pathOptions={{ fillColor: markerColor, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8 }}
            >
              <Popup>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold text-sm">{opportunity.address}</p>
                    <p className="text-xs text-muted-foreground">{opportunity.vendor_name}</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="font-medium">Stage:</span> {opportunity.stage?.toUpperCase()}</p>
                    <p><span className="font-medium">Warmth:</span> {opportunity.warmth}</p>
                    {opportunity.estimated_value && <p><span className="font-medium">Value:</span> ${opportunity.estimated_value.toLocaleString()}</p>}
                    {salesperson && (
                      <div className="flex items-center gap-2 pt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={salesperson.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {salesperson.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{salesperson.full_name || salesperson.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <FitBounds listings={[...filteredAppraisals, ...filteredOpportunities]} />
      </MapContainer>
    );
  };

  return (
    <>
      {!isFullscreen && (
        <div className="space-y-4">
          {renderMapControls()}
          <div className="rounded-lg overflow-hidden border shadow-lg">{renderMap('h-[700px]')}</div>
        </div>
      )}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] h-[98vh] p-4 flex flex-col">
          <DialogHeader className="flex-shrink-0"><DialogTitle>Map - Fullscreen View</DialogTitle></DialogHeader>
          <div className="flex-shrink-0 mb-4">{renderMapControls()}</div>
          <div className="rounded-lg overflow-hidden border shadow-lg flex-1 min-h-0">{renderMap('h-full')}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProspectMap;

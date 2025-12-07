import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Maximize2, User, Loader2 } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { GoogleMap as GoogleMapComponent, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

const WARMTH_COLORS: Record<string, string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
};

const INTENT_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const OUTCOME_COLORS: Record<string, string> = {
  won: '#22c55e',
  lost: '#6b7280',
};

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

interface ProspectMapProps {
  appraisals: LoggedAppraisal[];
  opportunities: Listing[];
  onAppraisalClick?: (appraisal: LoggedAppraisal) => void;
  onAutoGeocode?: () => void;
  isGeocoding?: boolean;
}

const ProspectMap = ({ appraisals, opportunities, onAppraisalClick, onAutoGeocode, isGeocoding }: ProspectMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const { members: teamMembers } = useTeamMembers();
  const [showAppraisals, setShowAppraisals] = useState(true);
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [warmthFilter, setWarmthFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);

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

  const getMarkerColor = (item: any, isAppraisal: boolean = false) => {
    const outcome = item.outcome;
    if (outcome === 'won') return OUTCOME_COLORS.won;
    if (outcome === 'lost') return OUTCOME_COLORS.lost;
    
    if (isAppraisal && item.intent) {
      return INTENT_COLORS[item.intent as keyof typeof INTENT_COLORS] || INTENT_COLORS.low;
    }
    
    return WARMTH_COLORS[item.warmth as keyof typeof WARMTH_COLORS] || WARMTH_COLORS.cold;
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    const allCoords: { lat: number; lng: number }[] = [];
    
    if (showAppraisals) {
      filteredAppraisals.forEach(a => {
        if (a.latitude && a.longitude) {
          allCoords.push({ lat: a.latitude, lng: a.longitude });
        }
      });
    }
    
    if (showOpportunities) {
      filteredOpportunities.forEach(o => {
        if (o.latitude && o.longitude) {
          allCoords.push({ lat: o.latitude, lng: o.longitude });
        }
      });
    }
    
    if (allCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allCoords.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, 50);
    }
  }, [filteredAppraisals, filteredOpportunities, showAppraisals, showOpportunities]);

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
            <Button variant="outline" size="sm" onClick={onAutoGeocode} disabled={isGeocoding}>
              {isGeocoding ? 'Geocoding...' : 'Auto-Geocode All'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="h-4 w-4 mr-2" />Fullscreen
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Intent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

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
        
        <Select value={warmthFilter} onValueChange={setWarmthFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Warmth" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warmth</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Outcomes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="won">WON</SelectItem>
            <SelectItem value="lost">LOST</SelectItem>
          </SelectContent>
        </Select>

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

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-muted-foreground">Appraisals:</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.high }} /><span className="text-xs">High</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.medium }} /><span className="text-xs">Med</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENT_COLORS.low }} /><span className="text-xs">Low</span></div>
          <div className="w-px h-4 bg-border mx-1"></div>
          <span className="text-xs text-muted-foreground">Outcome:</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: OUTCOME_COLORS.won }} /><span className="text-xs">WON</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: OUTCOME_COLORS.lost }} /><span className="text-xs">LOST</span></div>
        </div>
      </div>
    </div>
  );

  const renderAppraisalInfoWindow = (appraisal: LoggedAppraisal) => {
    const salesperson = teamMembers.find(m => m.user_id === appraisal.created_by);
    
    return (
      <div className="p-2 min-w-[200px]">
        <div className="font-bold text-sm">{appraisal.address}</div>
        {appraisal.suburb && <div className="text-xs text-gray-500">{appraisal.suburb}</div>}
        <div className="mt-2 text-xs space-y-1">
          <div><span className="font-medium">Vendor:</span> {appraisal.vendor_name}</div>
          <div><span className="font-medium">Intent:</span> {appraisal.intent}</div>
          <div><span className="font-medium">Stage:</span> {appraisal.stage}</div>
          <div><span className="font-medium">Outcome:</span> {appraisal.outcome}</div>
          {salesperson && (
            <div className="flex items-center gap-2 pt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={salesperson.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{salesperson.full_name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
              </Avatar>
              <span>{salesperson.full_name || salesperson.email}</span>
            </div>
          )}
        </div>
        {onAppraisalClick && (
          <Button size="sm" onClick={() => onAppraisalClick(appraisal)} className="w-full mt-2">View Details</Button>
        )}
      </div>
    );
  };

  const renderOpportunityInfoWindow = (opportunity: Listing) => {
    const salesperson = teamMembers.find(m => m.user_id === opportunity.assigned_to);
    
    return (
      <div className="p-2 min-w-[200px]">
        <div className="font-bold text-sm">{opportunity.address}</div>
        {opportunity.suburb && <div className="text-xs text-gray-500">{opportunity.suburb}</div>}
        <div className="mt-2 text-xs space-y-1">
          <div><span className="font-medium">Vendor:</span> {opportunity.vendor_name}</div>
          <div><span className="font-medium">Warmth:</span> {opportunity.warmth}</div>
          <div><span className="font-medium">Stage:</span> {opportunity.stage}</div>
          {salesperson && (
            <div className="flex items-center gap-2 pt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={salesperson.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{salesperson.full_name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
              </Avatar>
              <span>{salesperson.full_name || salesperson.email}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMap = (height: string) => {
    if (loadError) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
          <p className="text-destructive">Error loading Google Maps</p>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
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
          {showAppraisals && filteredAppraisals.map((appraisal) => (
            <MarkerF
              key={`appraisal-${appraisal.id}`}
              position={{ lat: appraisal.latitude!, lng: appraisal.longitude! }}
              onClick={() => setSelectedMarkerId(`appraisal-${appraisal.id}`)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: getMarkerColor(appraisal, true),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 10,
              }}
            >
              {selectedMarkerId === `appraisal-${appraisal.id}` && (
                <InfoWindowF
                  position={{ lat: appraisal.latitude!, lng: appraisal.longitude! }}
                  onCloseClick={() => setSelectedMarkerId(null)}
                >
                  {renderAppraisalInfoWindow(appraisal)}
                </InfoWindowF>
              )}
            </MarkerF>
          ))}

          {showOpportunities && filteredOpportunities.map((opportunity) => (
            <MarkerF
              key={`opportunity-${opportunity.id}`}
              position={{ lat: opportunity.latitude!, lng: opportunity.longitude! }}
              onClick={() => setSelectedMarkerId(`opportunity-${opportunity.id}`)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: getMarkerColor(opportunity, false),
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8,
              }}
            >
              {selectedMarkerId === `opportunity-${opportunity.id}` && (
                <InfoWindowF
                  position={{ lat: opportunity.latitude!, lng: opportunity.longitude! }}
                  onCloseClick={() => setSelectedMarkerId(null)}
                >
                  {renderOpportunityInfoWindow(opportunity)}
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
            <DialogTitle>Prospect Map</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {renderMapControls()}
            {renderMap('calc(90vh - 180px)')}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectMap;

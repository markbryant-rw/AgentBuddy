import { useMemo, useState, useCallback } from "react";
import { PastSale } from "@/hooks/usePastSales";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Loader2 } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { GoogleMap as GoogleMapComponent, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface PastSalesMapProps {
  pastSales: PastSale[];
  onOpenDetail: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  won_and_sold: '#22c55e',
  settled: '#22c55e',
  withdrawn: '#6b7280',
  lost: '#ef4444',
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
  fullscreenControl: true,
};

const PastSalesMap = ({ pastSales, onOpenDetail }: PastSalesMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const { members: teamMembers } = useTeamMembers();

  const geocodedSales = pastSales.filter((sale) => sale.latitude && sale.longitude);

  const filteredSales = useMemo(() => {
    let result = geocodedSales;
    
    if (selectedStatus) {
      result = result.filter((s) => s.status === selectedStatus);
    }
    
    if (salespersonFilter.length > 0) {
      result = result.filter((s) => s.agent_id && salespersonFilter.includes(s.agent_id));
    }
    
    return result;
  }, [geocodedSales, selectedStatus, salespersonFilter]);

  const getMarkerColor = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.withdrawn;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const statusOptions = [
    { value: "won_and_sold", label: "SOLD", color: "bg-green-600" },
    { value: "withdrawn", label: "WITHDRAWN", color: "bg-gray-600" },
  ];

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (filteredSales.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredSales.forEach(sale => {
        if (sale.latitude && sale.longitude) {
          bounds.extend({ lat: sale.latitude, lng: sale.longitude });
        }
      });
      map.fitBounds(bounds, 50);
    }
  }, [filteredSales]);

  const renderSaleInfoWindow = (sale: PastSale) => {
    const salesperson = teamMembers.find(m => m.id === sale.agent_id);
    
    return (
      <div className="p-2 min-w-[200px]">
        <div className="font-bold text-sm">{sale.address}</div>
        {sale.suburb && <div className="text-xs text-gray-500">{sale.suburb}</div>}
        <div className="mt-2 space-y-1">
          {salesperson && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={salesperson.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">{salesperson.full_name?.split(' ').map(n => n[0]).join('') || '?'}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{salesperson.full_name || salesperson.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{sale.status?.replace(/_/g, " ")}</Badge>
          </div>
          <div className="text-sm font-bold text-green-600">
            {formatCurrency(sale.sale_price)}
          </div>
          {sale.days_on_market && (
            <div className="text-xs">{sale.days_on_market} days on market</div>
          )}
        </div>
        <Button size="sm" className="w-full mt-2" onClick={() => onOpenDetail(sale.id)}>
          View Details
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedStatus === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(null)}
          >
            All ({geocodedSales.length})
          </Button>
          {statusOptions.map((option) => {
            const count = geocodedSales.filter((s) => s.status === option.value).length;
            return (
              <Button
                key={option.value}
                variant={selectedStatus === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(option.value)}
              >
                <div className={`w-3 h-3 rounded-full ${option.color} mr-2`} />
                {option.label} ({count})
              </Button>
            );
          })}
        </div>

        {teamMembers.length > 1 && (
          <TooltipProvider>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Salesperson:</span>
              <div className="flex items-center gap-1">
                {teamMembers.map((member) => {
                  const isSelected = salespersonFilter.includes(member.id);
                  return (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            setSalespersonFilter(prev => 
                              prev.includes(member.id)
                                ? prev.filter(id => id !== member.id)
                                : [...prev, member.id]
                            );
                          }}
                          className={`transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2 rounded-full' : 'opacity-60 hover:opacity-100'}`}
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
              {salespersonFilter.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSalespersonFilter([])}
                  className="text-xs h-6 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <div className="h-[600px] w-full">
          {loadError ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-destructive">Error loading Google Maps</p>
            </div>
          ) : !isLoaded ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-muted-foreground">
                No geocoded past sales to display. Add coordinates to see them on the map.
              </p>
            </div>
          ) : (
            <GoogleMapComponent
              mapContainerStyle={mapContainerStyle}
              center={DEFAULT_CENTER}
              zoom={11}
              options={mapOptions}
              onLoad={onMapLoad}
            >
              {filteredSales.map((sale) => (
                <MarkerF
                  key={sale.id}
                  position={{ lat: sale.latitude!, lng: sale.longitude! }}
                  onClick={() => setSelectedMarkerId(sale.id)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: getMarkerColor(sale.status),
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 10,
                  }}
                >
                  {selectedMarkerId === sale.id && (
                    <InfoWindowF
                      position={{ lat: sale.latitude!, lng: sale.longitude! }}
                      onCloseClick={() => setSelectedMarkerId(null)}
                    >
                      {renderSaleInfoWindow(sale)}
                    </InfoWindowF>
                  )}
                </MarkerF>
              ))}
            </GoogleMapComponent>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PastSalesMap;

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PastSale } from "@/hooks/usePastSales";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface PastSalesMapProps {
  pastSales: PastSale[];
  onOpenDetail: (id: string) => void;
}

// Map bounds updater component
const MapBoundsUpdater = ({ pastSales }: { pastSales: PastSale[] }) => {
  const map = useMap();

  useEffect(() => {
    const validSales = pastSales.filter((s) => s.latitude && s.longitude);
    if (validSales.length > 0) {
      const bounds = validSales.map((s) => [s.latitude!, s.longitude!] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pastSales, map]);

  return null;
};

const STATUS_COLORS: Record<string, string> = {
  won_and_sold: '#22c55e',
  settled: '#22c55e',
  withdrawn: '#6b7280',
  lost: '#ef4444',
};

const PastSalesMap = ({ pastSales, onOpenDetail }: PastSalesMapProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
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

  const showAvatars = salespersonFilter.length > 0;

  const getMarkerColor = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.withdrawn;
  };

  const createAvatarIcon = (salesperson: any, status: string) => {
    const borderColor = getMarkerColor(status);
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

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const statusOptions = [
    { value: "won_and_sold", label: "SOLD", color: "bg-green-600" },
    { value: "withdrawn", label: "WITHDRAWN", color: "bg-gray-600" },
  ];

  // Default center (Auckland, NZ)
  const defaultCenter: [number, number] = [-36.8485, 174.7633];

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status Filter Buttons */}
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

        {/* Salesperson Filter */}
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
          {filteredSales.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-muted-foreground">
                No geocoded past sales to display. Add coordinates to see them on the map.
              </p>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBoundsUpdater pastSales={filteredSales} />
              {filteredSales.map((sale) => {
                const salesperson = teamMembers.find(m => m.id === sale.agent_id);
                const markerColor = getMarkerColor(sale.status);
                
                if (showAvatars && salesperson) {
                  return (
                    <Marker
                      key={sale.id}
                      position={[sale.latitude!, sale.longitude!]}
                      icon={createAvatarIcon(salesperson, sale.status)}
                    >
                      <Popup>
                        <div className="space-y-2 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={salesperson.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {salesperson.full_name?.split(' ').map(n => n[0]).join('') || <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{sale.address}</p>
                              <p className="text-xs text-muted-foreground">{salesperson.full_name || salesperson.email}</p>
                            </div>
                          </div>
                          {sale.suburb && (
                            <div className="text-sm text-muted-foreground">{sale.suburb}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{sale.status.replace(/_/g, " ")}</Badge>
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(sale.sale_price)}
                          </div>
                          {sale.days_on_market && (
                            <div className="text-sm">{sale.days_on_market} days on market</div>
                          )}
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => onOpenDetail(sale.id)}
                          >
                            View Details
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                
                return (
                  <CircleMarker
                    key={sale.id}
                    center={[sale.latitude!, sale.longitude!]}
                    radius={10}
                    pathOptions={{
                      fillColor: markerColor,
                      color: '#fff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.8
                    }}
                  >
                    <Popup>
                      <div className="space-y-2 min-w-[200px]">
                        <div className="font-semibold">{sale.address}</div>
                        {sale.suburb && (
                          <div className="text-sm text-muted-foreground">{sale.suburb}</div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{sale.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="text-lg font-bold">
                          {formatCurrency(sale.sale_price)}
                        </div>
                        {sale.days_on_market && (
                          <div className="text-sm">{sale.days_on_market} days on market</div>
                        )}
                        <Button
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => onOpenDetail(sale.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PastSalesMap;

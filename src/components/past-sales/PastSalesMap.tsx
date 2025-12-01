import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { PastSale } from "@/hooks/usePastSales";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

const PastSalesMap = ({ pastSales, onOpenDetail }: PastSalesMapProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const geocodedSales = pastSales.filter((sale) => sale.latitude && sale.longitude);

  const filteredSales = selectedStatus
    ? geocodedSales.filter((s) => s.status === selectedStatus)
    : geocodedSales;

  const getMarkerIcon = (status: string) => {
    const colors: Record<string, string> = {
      won_and_sold: "green",
      withdrawn: "grey",
    };
    const color = colors[status] || "grey";

    return new Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
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
      {/* Filter Buttons */}
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
              {filteredSales.map((sale) => (
                <Marker
                  key={sale.id}
                  position={[sale.latitude!, sale.longitude!]}
                  icon={getMarkerIcon(sale.status)}
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
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PastSalesMap;
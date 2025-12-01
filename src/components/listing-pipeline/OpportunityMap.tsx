import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Listing } from '@/hooks/useListingPipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fixLeafletIcons } from '@/lib/leafletIconFix';

// Fix leaflet icon paths
fixLeafletIcons();

// Warmth color scheme
const WARMTH_COLORS = {
  hot: '#EF4444',
  warm: '#F59E0B',
  cold: '#3B82F6',
} as const;

const WARMTH_LABELS = {
  hot: '🔥 Hot',
  warm: '☀️ Warm',
  cold: '❄️ Cold',
} as const;

interface OpportunityMapProps {
  listings: Listing[];
  onListingSelect?: (listing: Listing) => void;
  onEditClick?: (listing: Listing) => void;
  visibleWarmth?: Array<'hot' | 'warm' | 'cold'>;
  searchQuery?: string;
}

// Component to fit map bounds to show all markers
const FitBounds = ({ listings }: { listings: Listing[] }) => {
  const map = useMap();

  useEffect(() => {
    // Safety check: ensure map is in a valid state before manipulating
    if (!map || !map.getContainer()) {
      return;
    }

    if (listings.length === 0) {
      // Default to Auckland if no listings
      try {
        map.setView([-36.8485, 174.7633], 11);
      } catch (error) {
        console.error('Error setting map view:', error);
      }
      return;
    }

    const bounds = listings
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude!, l.longitude!] as [number, number]);

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (error) {
        console.error('Error fitting map bounds:', error);
      }
    }
  }, [listings, map]);

  return null;
};

export const OpportunityMap = ({
  listings,
  onListingSelect,
  onEditClick,
  visibleWarmth = ['hot', 'warm', 'cold'],
  searchQuery = '',
}: OpportunityMapProps) => {
  // Filter listings that have coordinates and match visibility/search criteria
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // Must have coordinates
      if (!listing.latitude || !listing.longitude) return false;
      
      // Must match warmth filter
      if (!visibleWarmth.includes(listing.warmth)) return false;
      
      // Must match search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          listing.address.toLowerCase().includes(query) ||
          listing.vendor_name.toLowerCase().includes(query) ||
          listing.suburb?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [listings, visibleWarmth, searchQuery]);

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <MapContainer
      style={{ height: '100%', width: '100%' }}
      zoom={11}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds listings={filteredListings} />
      
      {filteredListings.map((listing) => (
        <CircleMarker
          key={listing.id}
          center={[listing.latitude!, listing.longitude!]}
          radius={8 + listing.likelihood * 2}
          pathOptions={{
            fillColor: WARMTH_COLORS[listing.warmth],
            color: WARMTH_COLORS[listing.warmth],
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
          }}
        >
          <Popup>
            <div className="space-y-2 min-w-[250px]">
              <div>
                <div className="font-semibold text-sm">{listing.address}</div>
                {listing.suburb && (
                  <div className="text-xs text-muted-foreground">{listing.suburb}</div>
                )}
              </div>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{listing.vendor_name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Warmth:</span>
                  <Badge variant="outline" className="text-xs">
                    {WARMTH_LABELS[listing.warmth]}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Likelihood:</span>
                  <span>{'⭐'.repeat(listing.likelihood)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected:</span>
                  <span className="font-medium">{formatDate(listing.expected_month)}</span>
                </div>
                
                {listing.estimated_value && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-medium">{formatPrice(listing.estimated_value)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onListingSelect?.(listing)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onEditClick?.(listing)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

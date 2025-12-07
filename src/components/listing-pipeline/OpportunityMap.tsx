import { useMemo, useState, useCallback } from 'react';
import { Listing } from '@/hooks/useListingPipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';

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

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: -36.8485, lng: 174.7633 }; // Auckland

export const OpportunityMap = ({
  listings,
  onListingSelect,
  onEditClick,
  visibleWarmth = ['hot', 'warm', 'cold'],
  searchQuery = '',
}: OpportunityMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Filter listings that have coordinates and match visibility/search criteria
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      if (!listing.latitude || !listing.longitude) return false;
      if (!visibleWarmth.includes(listing.warmth)) return false;
      
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

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // Fit bounds when listings change
  useMemo(() => {
    if (!map || filteredListings.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    filteredListings.forEach(listing => {
      if (listing.latitude && listing.longitude) {
        bounds.extend({ lat: listing.latitude, lng: listing.longitude });
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }
  }, [map, filteredListings]);

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

  const createMarkerIcon = (warmth: 'hot' | 'warm' | 'cold', likelihood: number) => {
    const color = WARMTH_COLORS[warmth];
    const size = 12 + likelihood * 3;
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.6,
      strokeColor: color,
      strokeWeight: 2,
      scale: size,
    };
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <p className="text-destructive">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={11}
      onLoad={onLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {filteredListings.map((listing) => (
        <Marker
          key={listing.id}
          position={{ lat: listing.latitude!, lng: listing.longitude! }}
          icon={createMarkerIcon(listing.warmth, listing.likelihood)}
          onClick={() => setSelectedListing(listing)}
        />
      ))}

      {selectedListing && (
        <InfoWindow
          position={{ lat: selectedListing.latitude!, lng: selectedListing.longitude! }}
          onCloseClick={() => setSelectedListing(null)}
        >
          <div className="space-y-2 min-w-[250px] p-1">
            <div>
              <div className="font-semibold text-sm">{selectedListing.address}</div>
              {selectedListing.suburb && (
                <div className="text-xs text-muted-foreground">{selectedListing.suburb}</div>
              )}
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor:</span>
                <span className="font-medium">{selectedListing.vendor_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Warmth:</span>
                <Badge variant="outline" className="text-xs">
                  {WARMTH_LABELS[selectedListing.warmth]}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Likelihood:</span>
                <span>{'⭐'.repeat(selectedListing.likelihood)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected:</span>
                <span className="font-medium">{formatDate(selectedListing.expected_month)}</span>
              </div>
              
              {selectedListing.estimated_value && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium">{formatPrice(selectedListing.estimated_value)}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onListingSelect?.(selectedListing)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEditClick?.(selectedListing)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

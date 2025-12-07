import { useCallback, useMemo, memo } from 'react';
import { GoogleMap as GoogleMapComponent, MarkerF, InfoWindowF, CircleF } from '@react-google-maps/api';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Loader2 } from 'lucide-react';

// Auckland, NZ default center
const DEFAULT_CENTER = { lat: -36.8485, lng: 174.7633 };
const DEFAULT_ZOOM = 11;

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title?: string;
  color?: string;
  radius?: number; // If set, renders as a circle instead of marker
  onClick?: () => void;
}

export interface GoogleMapProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onMarkerClick?: (markerId: string) => void;
  selectedMarkerId?: string | null;
  renderInfoWindow?: (markerId: string) => React.ReactNode;
  fitBounds?: boolean;
  className?: string;
}

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
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

const GoogleMap = memo(({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  height = '400px',
  onMarkerClick,
  selectedMarkerId,
  renderInfoWindow,
  fitBounds = true,
  className,
}: GoogleMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();

  const onLoad = useCallback((map: google.maps.Map) => {
    if (fitBounds && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend(marker.position);
      });
      map.fitBounds(bounds, 50);
      
      // Prevent too much zoom on single marker
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) {
          map.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, fitBounds]);

  const mapCenter = useMemo(() => {
    if (center) return center;
    if (markers.length > 0) {
      return markers[0].position;
    }
    return DEFAULT_CENTER;
  }, [center, markers]);

  if (loadError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-destructive">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <GoogleMapComponent
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        options={mapOptions}
        onLoad={onLoad}
      >
        {markers.map((marker) => {
          // Render as circle if radius is specified
          if (marker.radius) {
            return (
              <CircleF
                key={marker.id}
                center={marker.position}
                radius={marker.radius}
                options={{
                  fillColor: marker.color || '#3b82f6',
                  fillOpacity: 0.7,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  clickable: true,
                }}
                onClick={() => {
                  marker.onClick?.();
                  onMarkerClick?.(marker.id);
                }}
              />
            );
          }

          return (
            <MarkerF
              key={marker.id}
              position={marker.position}
              title={marker.title}
              onClick={() => {
                marker.onClick?.();
                onMarkerClick?.(marker.id);
              }}
              icon={marker.color ? {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: marker.color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 10,
              } : undefined}
            >
              {selectedMarkerId === marker.id && renderInfoWindow && (
                <InfoWindowF
                  position={marker.position}
                  onCloseClick={() => onMarkerClick?.(marker.id)}
                >
                  <div className="min-w-[200px]">
                    {renderInfoWindow(marker.id)}
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}
      </GoogleMapComponent>
    </div>
  );
});

GoogleMap.displayName = 'GoogleMap';

export { GoogleMap };

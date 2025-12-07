import { useMemo, useState, useCallback } from 'react';
import { Transaction, TransactionStage } from '@/hooks/useTransactions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';

const STAGE_COLORS: Record<TransactionStage, string> = {
  signed: '#9b87f5',
  live: '#14b8a6',
  contract: '#f59e0b',
  unconditional: '#f97316',
  settled: '#10b981',
};

const STAGE_LABELS: Record<TransactionStage, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};

interface TerritoryMapProps {
  transactions: Transaction[];
  onTransactionSelect: (transaction: Transaction) => void;
  onEditClick: (transaction: Transaction) => void;
  visibleStages?: Set<TransactionStage>;
  searchQuery?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: -36.8485, lng: 174.7633 }; // Auckland

export const TerritoryMap = ({
  transactions,
  onTransactionSelect,
  onEditClick,
  visibleStages,
  searchQuery = '',
}: TerritoryMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      if (!transaction.latitude || !transaction.longitude) return false;
      if (visibleStages && !visibleStages.has(transaction.stage)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          transaction.address?.toLowerCase().includes(query) ||
          transaction.suburb?.toLowerCase().includes(query) ||
          transaction.client_name?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [transactions, visibleStages, searchQuery]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // Fit bounds when transactions change
  useMemo(() => {
    if (!map || filteredTransactions.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    filteredTransactions.forEach(transaction => {
      if (transaction.latitude && transaction.longitude) {
        bounds.extend({ lat: transaction.latitude, lng: transaction.longitude });
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }
  }, [map, filteredTransactions]);

  const formatPrice = (price?: number) => {
    if (!price) return 'Not set';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const createMarkerIcon = (stage: TransactionStage) => {
    const color = STAGE_COLORS[stage];
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 12,
    };
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
        <p className="text-destructive">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      mapContainerClassName="rounded-lg"
      center={defaultCenter}
      zoom={11}
      onLoad={onLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {filteredTransactions.map((transaction) => (
        <Marker
          key={transaction.id}
          position={{ lat: transaction.latitude!, lng: transaction.longitude! }}
          icon={createMarkerIcon(transaction.stage)}
          onClick={() => setSelectedTransaction(transaction)}
        />
      ))}

      {selectedTransaction && (
        <InfoWindow
          position={{ lat: selectedTransaction.latitude!, lng: selectedTransaction.longitude! }}
          onCloseClick={() => setSelectedTransaction(null)}
        >
          <div className="space-y-3 py-2 min-w-[250px]">
            <div>
              <h3 className="font-semibold text-base mb-1">{selectedTransaction.address}</h3>
              {selectedTransaction.suburb && (
                <p className="text-sm text-muted-foreground">{selectedTransaction.suburb}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Client:</span> {selectedTransaction.client_name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Stage:</span>
                <Badge 
                  style={{ 
                    backgroundColor: STAGE_COLORS[selectedTransaction.stage],
                    color: '#ffffff'
                  }}
                >
                  {STAGE_LABELS[selectedTransaction.stage]}
                </Badge>
              </div>
              {selectedTransaction.sale_price && (
                <p className="text-sm">
                  <span className="font-medium">Price:</span> {formatPrice(selectedTransaction.sale_price)}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransactionSelect(selectedTransaction)}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditClick(selectedTransaction)}
                className="flex-1"
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

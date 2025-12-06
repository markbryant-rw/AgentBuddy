import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Transaction, TransactionStage } from '@/hooks/useTransactions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import L from 'leaflet';
import { fixLeafletIcons } from '@/lib/leafletIconFix';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons
fixLeafletIcons();

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

// Component to fit bounds when markers change
function FitBounds({ transactions }: { transactions: Transaction[] }) {
  const map = useMap();

  useEffect(() => {
    const validTransactions = transactions.filter(t => t.latitude && t.longitude);
    
    if (validTransactions.length > 0) {
      const bounds = L.latLngBounds(
        validTransactions.map(t => [t.latitude!, t.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Default to Auckland
      map.setView([-36.8485, 174.7633], 11);
    }
  }, [transactions, map]);

  return null;
}

interface TerritoryMapProps {
  transactions: Transaction[];
  onTransactionSelect: (transaction: Transaction) => void;
  onEditClick: (transaction: Transaction) => void;
  visibleStages?: Set<TransactionStage>;
  searchQuery?: string;
}

export const TerritoryMap = ({
  transactions,
  onTransactionSelect,
  onEditClick,
  visibleStages,
  searchQuery = '',
}: TerritoryMapProps) => {
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Filter by coordinates
      if (!transaction.latitude || !transaction.longitude) return false;

      // Filter by stage visibility
      if (visibleStages && !visibleStages.has(transaction.stage)) return false;

      // Filter by search query
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

  const formatPrice = (price?: number) => {
    if (!price) return 'Not set';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <MapContainer
      center={[-36.8485, 174.7633]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <FitBounds transactions={filteredTransactions} />

      <MarkerClusterGroup
        chunkedLoading
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        maxClusterRadius={50}
      >
        {filteredTransactions.map((transaction) => (
          <CircleMarker
            key={transaction.id}
            center={[transaction.latitude!, transaction.longitude!]}
            radius={8}
            pathOptions={{
              fillColor: STAGE_COLORS[transaction.stage],
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }}
          >
            <Popup maxWidth={300}>
              <div className="space-y-3 py-2">
                <div>
                  <h3 className="font-semibold text-base mb-1">{transaction.address}</h3>
                  {transaction.suburb && (
                    <p className="text-sm text-muted-foreground">{transaction.suburb}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Client:</span> {transaction.client_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Stage:</span>
                    <Badge 
                      style={{ 
                        backgroundColor: STAGE_COLORS[transaction.stage],
                        color: '#ffffff'
                      }}
                    >
                      {STAGE_LABELS[transaction.stage]}
                    </Badge>
                  </div>
                  {transaction.sale_price && (
                    <p className="text-sm">
                      <span className="font-medium">Price:</span> {formatPrice(transaction.sale_price)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransactionSelect(transaction);
                    }}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(transaction);
                    }}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

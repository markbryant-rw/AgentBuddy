import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MapPin, ChevronDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddressAutocomplete, AddressResult } from './AddressAutocomplete';

export interface LocationUpdateData {
  address: string;
  suburb: string;
  latitude: number;
  longitude: number;
}

interface LocationFixSectionProps {
  entityId: string;
  entityType: 'appraisal' | 'listing' | 'past-sale';
  address: string;
  suburb?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodeError?: string | null;
  geocodedAt?: string | null;
  onLocationUpdated: (data: LocationUpdateData) => void;
}

const LocationFixSection = ({
  entityId,
  entityType,
  address,
  suburb,
  latitude,
  longitude,
  geocodeError,
  onLocationUpdated,
}: LocationFixSectionProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(!!geocodeError);
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get the table name for updating address
  const getTableName = () => {
    switch (entityType) {
      case 'appraisal':
        return 'logged_appraisals';
      case 'listing':
        return 'listings_pipeline';
      case 'past-sale':
        return 'past_sales';
    }
  };

  const handleAddressSelect = (result: AddressResult) => {
    setSelectedAddress(result);
  };

  const handleUpdateLocation = async () => {
    if (!selectedAddress) {
      toast({
        title: 'Select an Address',
        description: 'Please select an address from the suggestions',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      const tableName = getTableName();
      
      // Update address, suburb, and coordinates directly from Photon result
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          address: selectedAddress.address,
          suburb: selectedAddress.suburb || suburb,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          geocode_error: null,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (updateError) {
        throw new Error(`Failed to update location: ${updateError.message}`);
      }

      toast({
        title: 'Location Updated',
        description: `Updated to: ${selectedAddress.fullDisplay}`,
      });

      // Notify parent with new location data
      onLocationUpdated({
        address: selectedAddress.address,
        suburb: selectedAddress.suburb,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
      });
      setSelectedAddress(null);
      
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update location',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const hasCoordinates = latitude && longitude;
  const hasError = !!geocodeError;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          type="button"
          className={`w-full justify-between p-4 rounded-lg border ${
            hasError 
              ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' 
              : 'bg-muted/50 border-border hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${hasError ? 'text-amber-600' : 'text-muted-foreground'}`} />
            <span className={`font-medium ${hasError ? 'text-amber-600' : 'text-foreground'}`}>
              Fix Location
            </span>
            {hasError && (
              <span className="text-xs text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded">
                Issue detected
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 p-4 rounded-lg bg-muted/50 border space-y-4">
        {/* Current Status */}
        <div className="flex items-start gap-2 text-sm">
          {hasError ? (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-600">Current location may be incorrect</p>
                <p className="text-muted-foreground text-xs mt-0.5">{geocodeError}</p>
              </div>
            </>
          ) : hasCoordinates ? (
            <>
              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-600">Location geocoded successfully</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Coordinates: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                </p>
              </div>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground">No coordinates set</p>
            </>
          )}
        </div>

        {/* Address Autocomplete */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Search for correct address
          </Label>
          <AddressAutocomplete
            defaultValue={`${address}${suburb ? `, ${suburb}` : ''}`}
            placeholder="Start typing to search NZ addresses..."
            onSelect={handleAddressSelect}
          />
          {selectedAddress && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Selected: {selectedAddress.fullDisplay}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Start typing to search NZ addresses
          </p>
        </div>

        {/* Update Location Button */}
        <Button
          type="button"
          onClick={handleUpdateLocation}
          disabled={isUpdating || !selectedAddress}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Update Location
            </>
          )}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default LocationFixSection;

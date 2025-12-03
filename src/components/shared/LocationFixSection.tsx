import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MapPin, ChevronDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationFixSectionProps {
  entityId: string;
  entityType: 'appraisal' | 'listing' | 'past-sale';
  address: string;
  suburb?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodeError?: string | null;
  geocodedAt?: string | null;
  onLocationUpdated: () => void;
}

const LocationFixSection = ({
  entityId,
  entityType,
  address,
  suburb,
  latitude,
  longitude,
  geocodeError,
  geocodedAt,
  onLocationUpdated,
}: LocationFixSectionProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(!!geocodeError);
  const [correctedAddress, setCorrectedAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Build the full address for re-geocoding
  const getDefaultAddress = () => {
    const parts = [address, suburb].filter(Boolean);
    return parts.join(', ');
  };

  // Get the edge function name based on entity type
  const getEdgeFunctionName = () => {
    switch (entityType) {
      case 'appraisal':
        return 'geocode-appraisal';
      case 'listing':
        return 'geocode-listing';
      case 'past-sale':
        return 'geocode-past-sale';
    }
  };

  // Get the ID field name for the edge function
  const getIdFieldName = () => {
    switch (entityType) {
      case 'appraisal':
        return 'appraisalId';
      case 'listing':
        return 'listingId';
      case 'past-sale':
        return 'pastSaleId';
    }
  };

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

  const handleReGeocode = async () => {
    const addressToUse = correctedAddress.trim() || getDefaultAddress();
    
    if (!addressToUse) {
      toast({
        title: 'Address Required',
        description: 'Please enter an address to geocode',
        variant: 'destructive',
      });
      return;
    }

    setIsGeocoding(true);

    try {
      // First update the address in the database if changed
      if (correctedAddress.trim()) {
        const tableName = getTableName();
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ 
            address: correctedAddress.trim(),
            geocode_error: null // Clear previous error
          })
          .eq('id', entityId);

        if (updateError) {
          throw new Error(`Failed to update address: ${updateError.message}`);
        }
      }

      // Call the geocoding edge function
      const functionName = getEdgeFunctionName();
      const idFieldName = getIdFieldName();
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { [idFieldName]: entityId },
      });

      // Handle edge function errors (including 404 "Address not found")
      if (error) {
        // Check if it's an "Address not found" error
        const errorMessage = error.message || '';
        if (errorMessage.includes('Address not found') || errorMessage.includes('404')) {
          toast({
            title: 'Address Not Found',
            description: 'The geocoding service could not find this address. Try being more specific (e.g., include street number, suburb, and city).',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Geocoding Failed',
            description: errorMessage || 'Failed to geocode address',
            variant: 'destructive',
          });
        }
        return;
      }

      if (data?.error) {
        // Handle error in response data
        if (data.error === 'Address not found') {
          toast({
            title: 'Address Not Found',
            description: 'The geocoding service could not find this address. Try being more specific (e.g., include street number, suburb, and city).',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Geocoding Failed',
            description: data.error,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'Location Updated',
        description: data?.formatted 
          ? `Found: ${data.formatted}`
          : `Coordinates updated (${data?.latitude?.toFixed(4)}, ${data?.longitude?.toFixed(4)})`,
      });

      // Notify parent to refresh data
      onLocationUpdated();
      setCorrectedAddress('');
      
    } catch (error) {
      console.error('Geocoding error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
      
      // Handle "Address not found" in catch block too
      if (errorMessage.includes('Address not found')) {
        toast({
          title: 'Address Not Found',
          description: 'Try a more specific address format: "123 Street Name, Suburb, Auckland, New Zealand"',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Geocoding Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGeocoding(false);
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

        {/* Corrected Address Input */}
        <div className="space-y-2">
          <Label htmlFor="corrected_address" className="text-sm font-medium">
            Corrected Address
          </Label>
          <Input
            id="corrected_address"
            value={correctedAddress}
            onChange={(e) => setCorrectedAddress(e.target.value)}
            placeholder={getDefaultAddress() || 'Enter full address...'}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            💡 Be specific - include suburb and city, e.g., "15 Example St, Sunnyvale, Auckland, New Zealand"
          </p>
        </div>

        {/* Re-geocode Button */}
        <Button
          type="button"
          onClick={handleReGeocode}
          disabled={isGeocoding}
          className="w-full"
        >
          {isGeocoding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Geocoding...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Re-geocode Address
            </>
          )}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default LocationFixSection;

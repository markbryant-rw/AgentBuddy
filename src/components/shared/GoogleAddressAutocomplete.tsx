import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

export interface AddressResult {
  address: string;
  suburb: string;
  latitude: number;
  longitude: number;
  fullDisplay: string;
}

interface GoogleAddressAutocompleteProps {
  placeholder?: string;
  onSelect: (result: AddressResult) => void;
  defaultValue?: string;
  className?: string;
  showSuburbOverride?: boolean;
  currentSuburb?: string;
  onSuburbChange?: (suburb: string) => void;
}

export function GoogleAddressAutocomplete({
  placeholder = "Start typing an address...",
  onSelect,
  defaultValue = "",
  className,
  showSuburbOverride = false,
  currentSuburb = "",
  onSuburbChange,
}: GoogleAddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuburbEdit, setShowSuburbEdit] = useState(false);
  const [suburbValue, setSuburbValue] = useState(currentSuburb);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDivRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize Google Places services
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      
      // Create a dummy div for PlacesService (required by the API)
      if (!dummyDivRef.current) {
        dummyDivRef.current = document.createElement('div');
      }
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
    }
  }, [isLoaded]);

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!isLoaded || !autocompleteServiceRef.current || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'nz' },
        types: ['address'],
      },
      (predictions, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setIsOpen(predictions.length > 0);
          setHighlightedIndex(-1);
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      }
    );
  }, [query, isLoaded]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;
    
    setIsLoading(true);
    setQuery(prediction.description);
    setIsOpen(false);
    
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'address_components', 'formatted_address'],
      },
      (place, status) => {
        setIsLoading(false);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Extract address components with priority-based suburb selection
          let streetNumber = '';
          let streetName = '';
          let suburb = '';
          let suburbPriority = 0; // Higher = more specific
          
          place.address_components?.forEach((component) => {
            if (component.types.includes('street_number')) {
              streetNumber = component.long_name;
            }
            if (component.types.includes('route')) {
              streetName = component.long_name;
            }
            // Priority-based suburb selection (most specific wins)
            if (component.types.includes('sublocality_level_1') && suburbPriority < 4) {
              suburb = component.long_name;
              suburbPriority = 4; // Most specific - actual suburb like "Glen Eden"
            } else if (component.types.includes('sublocality') && suburbPriority < 3) {
              suburb = component.long_name;
              suburbPriority = 3;
            } else if (component.types.includes('neighborhood') && suburbPriority < 2) {
              suburb = component.long_name;
              suburbPriority = 2;
            } else if (component.types.includes('locality') && suburbPriority < 1) {
              suburb = component.long_name;
              suburbPriority = 1; // Least specific - city like "Auckland"
            }
          });
          
          const address = [streetNumber, streetName].filter(Boolean).join(' ');
          
          const result: AddressResult = {
            address: address || prediction.structured_formatting.main_text,
            suburb,
            latitude: lat,
            longitude: lng,
            fullDisplay: place.formatted_address || prediction.description,
          };
          
          onSelect(result);
        }
      }
    );
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  if (!isLoaded) {
    return (
      <div className={cn("relative", className)}>
        <Input
          disabled
          placeholder="Loading Google Maps..."
          className="pr-8"
        />
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Sync suburb value when currentSuburb prop changes
  useEffect(() => {
    setSuburbValue(currentSuburb);
  }, [currentSuburb]);

  return (
    <div ref={wrapperRef} className={cn("space-y-2", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-[12000] w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto pointer-events-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-start gap-2 hover:bg-accent transition-colors",
                  highlightedIndex === index && "bg-accent"
                )}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">
                    {suggestion.structured_formatting.main_text}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {suggestion.structured_formatting.secondary_text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && !isLoading && suggestions.length === 0 && query.length >= 3 && (
          <div className="absolute z-[12000] w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 pointer-events-auto">
            <p className="text-sm text-muted-foreground">No addresses found</p>
          </div>
        )}
      </div>

      {/* Suburb override section */}
      {showSuburbOverride && (
        <div className="flex items-center gap-2">
          {showSuburbEdit ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={suburbValue}
                onChange={(e) => {
                  setSuburbValue(e.target.value);
                  onSuburbChange?.(e.target.value);
                }}
                placeholder="Enter suburb"
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSuburbEdit(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSuburbEdit(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              {currentSuburb ? `Edit suburb (${currentSuburb})` : 'Edit suburb'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export the type for backwards compatibility
export type { AddressResult as GoogleAddressResult };

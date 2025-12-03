import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    district?: string;
    locality?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export interface AddressResult {
  address: string;
  suburb: string;
  latitude: number;
  longitude: number;
  fullDisplay: string;
}

interface AddressAutocompleteProps {
  placeholder?: string;
  onSelect: (result: AddressResult) => void;
  defaultValue?: string;
  className?: string;
}

export function AddressAutocomplete({
  placeholder = "Start typing an address...",
  onSelect,
  defaultValue = "",
  className,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions from Photon API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://photon.komoot.io/api?q=${encodeURIComponent(debouncedQuery)}&countrycodes=nz&limit=5`
        );
        const data: PhotonResponse = await response.json();

        const results: AddressResult[] = data.features.map((feature) => {
          const props = feature.properties;
          const [lng, lat] = feature.geometry.coordinates;

          // Build address string
          const addressParts: string[] = [];
          if (props.housenumber) addressParts.push(props.housenumber);
          if (props.street) addressParts.push(props.street);
          const address = addressParts.join(' ') || props.name || '';

          // Get suburb from district, locality, or city
          const suburb = props.district || props.locality || props.city || '';

          // Build full display string
          const displayParts: string[] = [];
          if (address) displayParts.push(address);
          if (suburb && suburb !== address) displayParts.push(suburb);
          if (props.city && props.city !== suburb) displayParts.push(props.city);
          if (props.postcode) displayParts.push(props.postcode);

          return {
            address: address || debouncedQuery,
            suburb,
            latitude: lat,
            longitude: lng,
            fullDisplay: displayParts.join(', '),
          };
        });

        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

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

  const handleSelect = (result: AddressResult) => {
    setQuery(result.fullDisplay);
    setIsOpen(false);
    onSelect(result);
  };

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

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
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
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.latitude}-${suggestion.longitude}-${index}`}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-start gap-2 hover:bg-accent transition-colors",
                highlightedIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">{suggestion.fullDisplay}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <p className="text-sm text-muted-foreground">No addresses found</p>
        </div>
      )}
    </div>
  );
}

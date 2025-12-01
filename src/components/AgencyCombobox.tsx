import { useState } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Agency {
  id: string;
  name: string;
  slug: string;
}

interface AgencyComboboxProps {
  agencies: Agency[];
  value: string | null;
  onValueChange: (agencyId: string | null) => void;
  disabled?: boolean;
}

export function AgencyCombobox({ 
  agencies, 
  value, 
  onValueChange, 
  disabled 
}: AgencyComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedAgency = agencies.find((agency) => agency.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex items-center">
            <Building2 className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            {selectedAgency ? (
              <span className="truncate">{selectedAgency.name}</span>
            ) : (
              <span className="text-muted-foreground">Search for your office...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search offices..." />
          <CommandList>
            <CommandEmpty>No office found.</CommandEmpty>
            <CommandGroup>
              {agencies.map((agency) => (
                <CommandItem
                  key={agency.id}
                  value={agency.name}
                  onSelect={() => {
                    onValueChange(agency.id === value ? null : agency.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === agency.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {agency.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

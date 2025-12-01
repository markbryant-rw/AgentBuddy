import { useState } from 'react';
import { Building2, Check, ChevronDown, Loader2, Search, Star } from 'lucide-react';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OfficeSwitcher() {
  const { availableOffices, activeOffice, switchOffice, isSwitching, isLoading, canSwitchOffices } = useOfficeSwitcher();
  const [searchQuery, setSearchQuery] = useState('');

  if (!canSwitchOffices || isLoading) {
    return null;
  }

  const filteredOffices = availableOffices.filter((office) =>
    office.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className="gap-2 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent/50 transition-colors"
          disabled={isSwitching}
        >
          <Building2 className="h-4 w-4" />
          <span className="font-medium">
            {activeOffice ? activeOffice.name : 'Select Office'}
          </span>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>
          <div>Switch Office</div>
          <div className="text-xs font-normal text-muted-foreground mt-0.5">
            Your selection is saved as your default office
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Search */}
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search offices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Office List */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOffices.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No offices found
            </div>
          ) : (
            filteredOffices.map((office) => (
              <DropdownMenuItem
                key={office.id}
                onClick={() => switchOffice(office.id)}
                disabled={isSwitching || office.id === activeOffice?.id}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: office.brand_color || 'hsl(var(--primary))' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{office.name}</div>
                    {office.brand && (
                      <div className="text-xs text-muted-foreground truncate">
                        {office.brand}
                      </div>
                    )}
                  </div>
                  {office.id === activeOffice?.id && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
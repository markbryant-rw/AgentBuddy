import { Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
}

interface ListingFilterBarProps {
  warmthFilter: string[];
  salespersonFilter: string[];
  searchTerm: string;
  teamMembers: TeamMember[];
  onWarmthChange: (warmth: string[]) => void;
  onSalespersonChange: (salespeople: string[]) => void;
  onSearchChange: (term: string) => void;
  onClearFilters: () => void;
}

const warmthOptions = [
  { value: 'hot', label: '🔥 Hot', activeClass: 'bg-red-500 hover:bg-red-600 text-white' },
  { value: 'warm', label: '☀️ Warm', activeClass: 'bg-orange-500 hover:bg-orange-600 text-white' },
  { value: 'cold', label: '❄️ Cold', activeClass: 'bg-blue-500 hover:bg-blue-600 text-white' },
];

export const ListingFilterBar = ({
  warmthFilter,
  salespersonFilter,
  searchTerm,
  teamMembers,
  onWarmthChange,
  onSalespersonChange,
  onSearchChange,
  onClearFilters,
}: ListingFilterBarProps) => {
  const hasActiveFilters = warmthFilter.length > 0 || salespersonFilter.length > 0 || searchTerm.length > 0;
  const totalFilterCount = warmthFilter.length + salespersonFilter.length;

  const toggleWarmth = (value: string) => {
    if (warmthFilter.includes(value)) {
      onWarmthChange(warmthFilter.filter(w => w !== value));
    } else {
      onWarmthChange([...warmthFilter, value]);
    }
  };

  const toggleSalesperson = (userId: string) => {
    if (salespersonFilter.includes(userId)) {
      onSalespersonChange(salespersonFilter.filter(id => id !== userId));
    } else {
      onSalespersonChange([...salespersonFilter, userId]);
    }
  };

  const clearAllFilters = () => {
    onWarmthChange([]);
    onSalespersonChange([]);
    onClearFilters();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <Input
        placeholder="Search address or vendor..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-[250px]"
      />

      {/* Filters Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {totalFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {totalFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Warmth</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-2 p-2">
            {warmthOptions.map((option) => (
              <Button
                key={option.value}
                variant={warmthFilter.includes(option.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleWarmth(option.value)}
                className={cn(
                  warmthFilter.includes(option.value) && option.activeClass
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Salesperson</DropdownMenuLabel>
          <TooltipProvider>
            <div className="flex flex-wrap gap-2 p-2">
              {teamMembers.map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleSalesperson(member.id)}
                      className={cn(
                        "relative transition-all hover:scale-110",
                        salespersonFilter.includes(member.id) && "ring-2 ring-primary ring-offset-2 rounded-full"
                      )}
                    >
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{member.full_name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

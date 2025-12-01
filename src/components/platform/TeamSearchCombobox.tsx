import { useState } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTeamSearch, TeamWithCount } from "@/hooks/useTeamSearch";

interface TeamSearchComboboxProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}

export function TeamSearchCombobox({ value, onValueChange, disabled }: TeamSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { teams, isLoading } = useTeamSearch(searchTerm);

  const selectedTeam = teams.find((team) => team.id === value);

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
          {selectedTeam ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{selectedTeam.name}</span>
              <span className="text-xs text-muted-foreground">
                ({selectedTeam.member_count} {selectedTeam.member_count === 1 ? 'member' : 'members'})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Search teams...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search teams..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading teams..." : "No teams found."}
            </CommandEmpty>
            <CommandGroup>
              {teams.map((team) => (
                <CommandItem
                  key={team.id}
                  value={team.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? null : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === team.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{team.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({team.member_count} {team.member_count === 1 ? 'member' : 'members'})
                      </span>
                    </div>
                    {team.agency_name && (
                      <span className="text-xs text-muted-foreground">
                        {team.agency_name}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

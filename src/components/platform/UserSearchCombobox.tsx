import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserSearchComboboxProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}

interface UserWithTeam {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  team_name?: string;
}

export function UserSearchCombobox({ value, onValueChange, disabled }: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['user-search-all', searchTerm],
    queryFn: async () => {
      let query = (supabase as any)
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url
        `)
        .eq('is_active', true)
        .order('full_name');

      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: profilesData, error } = await query.limit(20);
      if (error) throw error;

      // Get team for each user (only one team per user now)
      const usersWithTeams = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: teamData } = await (supabase as any)
            .from('team_members')
            .select('team_id')
            .eq('user_id', profile.id)
            .maybeSingle();

          let teamName: string | undefined;
          if (teamData?.team_id) {
            const { data: team } = await (supabase as any)
              .from('teams')
              .select('name')
              .eq('id', teamData.team_id)
              .single();
            teamName = team?.name;
          }

          return {
            ...profile,
            team_name: teamName,
          };
        })
      );

      return usersWithTeams as UserWithTeam[];
    },
    enabled: searchTerm.length >= 2 || open,
  });

  const selectedUser = users.find((user) => user.id === value);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.full_name}</span>
              <span className="text-xs text-muted-foreground truncate">
                ({selectedUser.email})
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">Search users...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading users..." : searchTerm.length < 2 ? "Type at least 2 characters to search..." : "No users found."}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? null : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.full_name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{user.email}</span>
                      {user.team_name && (
                        <>
                          <span>•</span>
                          <span>{user.team_name}</span>
                        </>
                      )}
                    </div>
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

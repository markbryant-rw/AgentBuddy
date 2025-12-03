import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { getRoleIcon, getRoleDisplayName } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Role seniority order: highest first
const ROLE_SENIORITY: AppRole[] = ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'];

export function RoleSwitcher() {
  const { activeRole, availableRoles, switchRole, isSwitching, isLoading } = useRoleSwitcher();

  // Sort available roles by seniority
  const sortedRoles = useMemo(() => {
    return [...availableRoles].sort((a, b) => {
      return ROLE_SENIORITY.indexOf(a) - ROLE_SENIORITY.indexOf(b);
    });
  }, [availableRoles]);

  // Don't show switcher if user has only one role
  if (isLoading || !availableRoles || availableRoles.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between hover:bg-accent/50 transition-colors"
          disabled={isSwitching}
        >
          <span className="flex items-center gap-2">
            <span className="text-lg">{getRoleIcon(activeRole || availableRoles[0])}</span>
            <span className="text-sm font-medium">
              Switch View
            </span>
          </span>
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            disabled={isSwitching || role === activeRole}
            className="cursor-pointer"
          >
            <span className="flex items-center gap-3 w-full">
              <span className="text-lg">{getRoleIcon(role)}</span>
              <span className="flex-1">{getRoleDisplayName(role)}</span>
              {role === activeRole && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

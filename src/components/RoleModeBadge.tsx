import { getRoleIcon, getRoleDisplayName, getRoleBadgeColor } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';

interface RoleModeBadgeProps {
  role: AppRole | null;
}

export function RoleModeBadge({ role }: RoleModeBadgeProps) {
  if (!role) return null;

  return (
    <Badge 
      variant="outline" 
      className={`hidden lg:flex items-center gap-1.5 text-xs font-medium ${getRoleBadgeColor(role)}`}
    >
      <span className="text-base leading-none">{getRoleIcon(role)}</span>
      <span>{getRoleDisplayName(role)} Mode</span>
    </Badge>
  );
}

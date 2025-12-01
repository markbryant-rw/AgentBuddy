import { Badge } from '@/components/ui/badge';
import { Shield, Crown, Users } from 'lucide-react';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'default';
}

export const RoleBadge = ({ role, size = 'default' }: RoleBadgeProps) => {
  const roleConfig: Record<string, { label: string; icon: typeof Shield; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    platform_admin: {
      label: 'Platform Admin',
      icon: Crown,
      variant: 'destructive',
    },
    super_admin: {
      label: 'Super Admin',
      icon: Shield,
      variant: 'default',
    },
    admin: {
      label: 'Team Admin',
      icon: Users,
      variant: 'secondary',
    },
  };

  const config = roleConfig[role] || {
    label: role,
    icon: Shield,
    variant: 'outline' as const,
  };

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-1.5 py-0' : 'px-2.5 py-0.5';

  return (
    <Badge variant={config.variant} className={`${padding} ${textSize}`}>
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  );
};

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, Eye, Mail } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { getRoleBadgeVariant } from '@/lib/rbac';

interface CompactUserCardProps {
  user: AdminUser;
  onViewDetails: (userId: string) => void;
  onRepair?: (user: AdminUser) => void;
}

export const CompactUserCard = ({ user, onViewDetails, onRepair }: CompactUserCardProps) => {
  const isOrphaned = !user.inviter && user.status === 'pending';
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={user.avatar_url || ''} />
          <AvatarFallback className="text-xs">
            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate text-sm">
              {user.full_name || 'No name set'}
            </h4>
            {user.roles && user.roles.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {user.roles.map((role, idx) => (
                  <Badge
                    key={idx}
                    variant={getRoleBadgeVariant(role)}
                    className="text-xs px-1.5 py-0"
                  >
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isOrphaned && onRepair && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRepair(user);
            }}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 h-8"
          >
            <Wrench className="h-3 w-3" />
          </Button>
        )}
        {user.status === 'inactive' && (
          <Badge variant="outline" className="text-xs">
            Inactive
          </Badge>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onViewDetails(user.id)}
          className="h-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
};

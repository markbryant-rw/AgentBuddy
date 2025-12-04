import { useState, useEffect } from 'react';
import { Check, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DailyPlannerItem } from '@/hooks/useDailyPlanner';

interface CompactAssignerProps {
  item: DailyPlannerItem;
  onSave: (itemId: string, userIds: string[]) => void;
}

export function CompactAssigner({ item, onSave }: CompactAssignerProps) {
  const { members, isLoading } = useTeamMembers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // Sync with item's assigned users when item changes
  useEffect(() => {
    setSelectedIds(item.assigned_users?.map(u => u.id) || []);
  }, [item.assigned_users]);

  const handleToggle = (userId: string) => {
    const newIds = selectedIds.includes(userId)
      ? selectedIds.filter(id => id !== userId)
      : [...selectedIds, userId];
    setSelectedIds(newIds);
    onSave(item.id, newIds);
  };

  const assignedUsers = item.assigned_users || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {assignedUsers.length > 0 ? (
          <button
            className="flex -space-x-2 hover:opacity-80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {assignedUsers.slice(0, 3).map((user) => (
              <Avatar key={user.id} className="h-7 w-7 border-2 border-background">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignedUsers.length > 3 && (
              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                +{assignedUsers.length - 3}
              </div>
            )}
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <User className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-2" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2 text-center">Loading...</div>
          ) : members.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 text-center">No team members</div>
          ) : (
            members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleToggle(member.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-1.5 rounded-md transition-colors text-left",
                  selectedIds.includes(member.id)
                    ? "bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-muted"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {member.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate flex-1">{member.full_name || 'Unknown'}</span>
                {selectedIds.includes(member.id) && (
                  <Check className="h-3 w-3 text-primary flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
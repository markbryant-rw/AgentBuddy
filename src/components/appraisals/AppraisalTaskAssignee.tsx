import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppraisalTaskAssigneeProps {
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

export const AppraisalTaskAssignee = ({ 
  assignee, 
  onAssign,
  disabled 
}: AppraisalTaskAssigneeProps) => {
  const [open, setOpen] = useState(false);
  const { members, isLoading } = useTeamMembers();

  const handleSelect = (userId: string | null) => {
    onAssign(userId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button 
          className={cn(
            "flex-shrink-0 rounded-full transition-opacity",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {assignee ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={assignee.avatar_url || ''} />
              <AvatarFallback className="text-[10px]">
                {assignee.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            Loading...
          </div>
        ) : (
          <div className="space-y-0.5">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
              onClick={() => handleSelect(null)}
            >
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">Unassigned</span>
            </button>
            {members.map((member) => (
              <button
                key={member.id}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
                  assignee?.id === member.id && "bg-muted"
                )}
                onClick={() => handleSelect(member.id)}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {member.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.full_name || member.email}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

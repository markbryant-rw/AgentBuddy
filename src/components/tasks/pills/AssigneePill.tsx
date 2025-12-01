import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TaskAssigneeSelector } from '../TaskAssigneeSelector';
import { cn } from '@/lib/utils';

interface AssigneePillProps {
  task: any;
  showAlways?: boolean;
  isHovered?: boolean;
}

export const AssigneePill = ({ task, showAlways = true, isHovered = false }: AssigneePillProps) => {
  const [open, setOpen] = useState(false);

  const assignee = task.assignees?.[0];
  const shouldShow = assignee || showAlways || isHovered;

  if (!shouldShow) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {assignee ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {assignee.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0",
              "transition-all duration-200",
              "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <UserIcon className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 z-[9999]" 
        align="start"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <TaskAssigneeSelector
          taskId={task.id}
          selectedAssignees={task.assignees?.map((a: any) => a.id) || []}
          onAssigneesChange={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};

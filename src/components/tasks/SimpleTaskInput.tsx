import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, User, Flag } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SimpleTaskInputProps {
  projectId?: string;
  onTaskCreated?: () => void;
}

export const SimpleTaskInput = ({ projectId, onTaskCreated }: SimpleTaskInputProps) => {
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { members } = useTeamMembers();
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignedTo, setAssignedTo] = useState<string>(user?.id || '');
  const [isCreating, setIsCreating] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
      e.preventDefault();
      await handleCreate();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    
    setIsCreating(true);
    try {
      await createTask({
        title: title.trim(),
        dueDate: dueDate?.toISOString() || undefined,
        listId: projectId || '',
        description: undefined,
      });
      
      setTitle('');
      setDueDate(null);
      setAssignedTo(user.id);
      setIsExpanded(false);
      onTaskCreated?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDueDate(null);
    setPriority('medium');
    setAssignedTo(user?.id || '');
    setIsExpanded(false);
  };

  const selectedMember = members.find(m => m.user_id === assignedTo);

  return (
    <div className="space-y-2 mb-4">
      <div className={cn(
        "relative transition-all duration-200",
        isExpanded && "bg-card rounded-lg border border-border p-4 shadow-sm"
      )}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task... (Press Enter to create, Shift+Enter for options)"
          autoFocus
          className={cn(
            "text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20",
            !isExpanded && "border-2 hover:border-primary/30 focus:border-primary shadow-sm",
            isExpanded && "border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          )}
          disabled={isCreating}
        />
        
        {isExpanded && (
          <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDueDate(new Date())}
                className={cn("gap-2", dueDate && "bg-primary/10")}
              >
                <Calendar className="h-4 w-4" />
                {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
              </Button>

              <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("gap-2", assignedTo !== user?.id && "bg-primary/10")}
                  >
                    <User className="h-4 w-4" />
                    {selectedMember ? (
                      <span className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={selectedMember.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {selectedMember.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {selectedMember.full_name}
                      </span>
                    ) : 'Assign to'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandEmpty>No members found.</CommandEmpty>
                    <CommandGroup>
                      {members.map((member) => (
                        <CommandItem
                          key={member.user_id}
                          value={member.full_name || ''}
                          onSelect={() => {
                            setAssignedTo(member.user_id);
                            setAssigneePopoverOpen(false);
                          }}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          {member.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex gap-1">
                <Button
                  variant={priority === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority('low')}
                >
                  <Flag className="h-3 w-3 text-blue-500" />
                </Button>
                <Button
                  variant={priority === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority('medium')}
                >
                  <Flag className="h-3 w-3 text-yellow-500" />
                </Button>
                <Button
                  variant={priority === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority('high')}
                >
                  <Flag className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!title.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

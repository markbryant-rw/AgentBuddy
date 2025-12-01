import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { X } from "lucide-react";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTaskAssignees } from "@/hooks/useTaskAssignees";
import { toast } from "sonner";

interface TaskAssigneeSelectorProps {
  taskId?: string;
  selectedAssignees?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  onAssigneesChange?: (assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }>) => void;
}

export const TaskAssigneeSelector = ({ 
  taskId,
  selectedAssignees = [],
  onAssigneesChange 
}: TaskAssigneeSelectorProps) => {
  const { members: teamMembers } = useTeamMembers();
  const taskAssignees = taskId ? useTaskAssignees(taskId) : null;
  
  // Use task-specific assignees if available, otherwise use passed in selectedAssignees
  const currentAssignees = taskId && taskAssignees 
    ? taskAssignees.assignees.map(a => a.user)
    : selectedAssignees;

  const handleAddAssignee = (userId: string) => {
    const user = teamMembers.find(m => m.id === userId);
    
    if (taskId && taskAssignees) {
      // Use the task assignees hook
      taskAssignees.addAssignee(userId);
      toast.success(`${user?.full_name || 'User'} assigned`);
    } else if (onAssigneesChange) {
      // Fallback to callback
      if (user && !currentAssignees.some(a => a.id === userId)) {
        onAssigneesChange([...currentAssignees, { 
          id: user.id, 
          full_name: user.full_name, 
          avatar_url: user.avatar_url 
        }]);
        toast.success(`${user.full_name || 'User'} assigned`);
      }
    }
  };

  const handleRemoveAssignee = (userId: string) => {
    if (taskId && taskAssignees) {
      // Use the task assignees hook
      taskAssignees.removeAssignee(userId);
      toast.success('Assignee removed');
    } else if (onAssigneesChange) {
      // Fallback to callback
      onAssigneesChange(currentAssignees.filter(a => a.id !== userId));
      toast.success('Assignee removed');
    }
  };

  const availableMembers = teamMembers.filter(
    member => !currentAssignees.some(a => a.id === member.id)
  );

  return (
    <div className="space-y-3">
      {/* Selected Assignees */}
      {currentAssignees.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentAssignees.map((assignee) => (
            <Badge key={assignee.id} variant="secondary" className="pl-1 pr-2 py-1 gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignee.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {assignee.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{assignee.full_name || 'Unknown'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={() => handleRemoveAssignee(assignee.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search & Add */}
      <Command className="border rounded-lg bg-popover pointer-events-auto">
        <CommandInput placeholder="Search team members..." />
        <CommandEmpty>No team members found.</CommandEmpty>
        <CommandGroup className="max-h-[200px] overflow-auto">
          {availableMembers.map((member) => (
            <CommandItem
              key={member.id}
              onSelect={() => handleAddAssignee(member.id)}
              className="cursor-pointer pointer-events-auto"
            >
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span>{member.full_name || 'Unknown'}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </div>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Filter, X } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdvancedFilterSidebarProps {
  onFilterChange: (filters: any) => void;
  currentFilters: any;
}

export const AdvancedFilterSidebar = ({
  onFilterChange,
  currentFilters,
}: AdvancedFilterSidebarProps) => {
  const { members: teamMembers } = useTeamMembers();
  
  const statuses = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const priorities = [
    { value: 'high', label: 'High', color: 'text-red-500' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
    { value: 'low', label: 'Low', color: 'text-blue-500' },
  ];

  const handleStatusToggle = (status: string) => {
    const current = currentFilters.status || [];
    const updated = current.includes(status)
      ? current.filter((s: string) => s !== status)
      : [...current, status];
    onFilterChange({ ...currentFilters, status: updated });
  };

  const handlePriorityToggle = (priority: string) => {
    const current = currentFilters.priority || [];
    const updated = current.includes(priority)
      ? current.filter((p: string) => p !== priority)
      : [...current, priority];
    onFilterChange({ ...currentFilters, priority: updated });
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    const current = currentFilters.assignee || [];
    const updated = current.includes(assigneeId)
      ? current.filter((a: string) => a !== assigneeId)
      : [...current, assigneeId];
    onFilterChange({ ...currentFilters, assignee: updated });
  };

  const handleClearAll = () => {
    onFilterChange({});
  };

  const hasActiveFilters = 
    (currentFilters.status?.length > 0) ||
    (currentFilters.priority?.length > 0) ||
    (currentFilters.assignee?.length > 0);

  return (
    <div className="w-64 border-r bg-card/50">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Filters</h3>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Status
            </Label>
            <div className="space-y-2">
              {statuses.map((status) => (
                <div key={status.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={currentFilters.status?.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Priority
            </Label>
            <div className="space-y-2">
              {priorities.map((priority) => (
                <div key={priority.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`priority-${priority.value}`}
                    checked={currentFilters.priority?.includes(priority.value)}
                    onCheckedChange={() => handlePriorityToggle(priority.value)}
                  />
                  <Label
                    htmlFor={`priority-${priority.value}`}
                    className={`text-sm cursor-pointer ${priority.color}`}
                  >
                    {priority.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Assignee Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Assignee
            </Label>
            <div className="space-y-2">
              {teamMembers?.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`assignee-${member.id}`}
                    checked={currentFilters.assignee?.includes(member.id)}
                    onCheckedChange={() => handleAssigneeToggle(member.id)}
                  />
                  <Label
                    htmlFor={`assignee-${member.id}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.full_name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    {member.full_name || member.email}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

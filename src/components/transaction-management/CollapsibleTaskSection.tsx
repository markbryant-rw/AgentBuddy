import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2, Info, GripVertical } from 'lucide-react';
import { TransactionTask } from './TransactionTaskBuilder';

const SECTION_COLORS: Record<string, string> = {
  'GETTING STARTED': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'MARKETING': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'LEGAL': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  'FINANCE': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  'DUE DILIGENCE': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  'SETTLEMENT': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  'HANDOVER': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
  'CLIENT CARE': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30',
  'ADMIN': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30',
  'COMPLIANCE': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
};

const SECTION_HEADER_COLORS: Record<string, string> = {
  'GETTING STARTED': 'border-l-blue-500',
  'MARKETING': 'border-l-purple-500',
  'LEGAL': 'border-l-red-500',
  'FINANCE': 'border-l-green-500',
  'DUE DILIGENCE': 'border-l-orange-500',
  'SETTLEMENT': 'border-l-emerald-500',
  'HANDOVER': 'border-l-teal-500',
  'CLIENT CARE': 'border-l-pink-500',
  'ADMIN': 'border-l-gray-500',
  'COMPLIANCE': 'border-l-yellow-500',
};

interface CollapsibleTaskSectionProps {
  section: string;
  tasks: (TransactionTask & { _originalIndex?: number })[];
  onUpdateTask: (originalIndex: number, updates: Partial<TransactionTask>) => void;
  onRemoveTask: (originalIndex: number) => void;
  onAddTask: () => void;
  teamMembers?: Array<{
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
  isDefaultTemplate?: boolean;
  disabled?: boolean;
}

export function CollapsibleTaskSection({
  section,
  tasks,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  teamMembers = [],
  isDefaultTemplate = false,
  disabled = false,
}: CollapsibleTaskSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="space-y-2"
    >
      <div 
        id={`section-${section.replace(/\s/g, '-')}`}
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border-l-4 bg-muted/50',
          SECTION_HEADER_COLORS[section] || 'border-l-gray-400'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <Badge 
              variant="outline" 
              className={cn('font-semibold', SECTION_COLORS[section] || 'bg-secondary')}
            >
              {section}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </button>
        </CollapsibleTrigger>
        
        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-2 pl-4">
        {tasks.map((task, index) => {
          const originalIndex = (task as any)._originalIndex ?? index;
          
          return (
            <div 
              key={`${section}-${index}`}
              className="flex items-center gap-2 p-2 bg-card border rounded-lg hover:border-primary/50 transition-colors"
            >
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Title Input */}
              <div className="flex-[2]">
                <Input
                  value={task.title}
                  onChange={(e) => onUpdateTask(originalIndex, { title: e.target.value })}
                  placeholder="Task title..."
                  className="h-9 border-0 shadow-none focus-visible:ring-1"
                  disabled={disabled}
                />
              </div>

              {/* Assignee Dropdown */}
              <div className="flex-1">
                <Select 
                  value={
                    task.assigned_to_user 
                      ? task.assigned_to_user 
                      : task.assigned_to_role 
                        ? `ROLE:${task.assigned_to_role}` 
                        : 'UNASSIGNED'
                  } 
                  onValueChange={(value) => {
                    if (value === 'UNASSIGNED' || value === 'separator') {
                      onUpdateTask(originalIndex, { assigned_to_user: undefined, assigned_to_role: undefined });
                    } else if (value.startsWith('ROLE:')) {
                      onUpdateTask(originalIndex, { assigned_to_user: undefined, assigned_to_role: value.replace('ROLE:', '') });
                    } else {
                      onUpdateTask(originalIndex, { assigned_to_user: value, assigned_to_role: undefined });
                    }
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                    {teamMembers.length > 0 && <SelectItem value="separator" disabled>─────</SelectItem>}
                    {isDefaultTemplate ? (
                      <>
                        <SelectItem value="ROLE:Salesperson">👤 Salesperson</SelectItem>
                        <SelectItem value="ROLE:Admin">👤 Admin</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="ROLE:Lead Salesperson">👤 Lead Salesperson</SelectItem>
                        <SelectItem value="ROLE:Secondary Salesperson">👤 Secondary Salesperson</SelectItem>
                        <SelectItem value="ROLE:Admin">👤 Admin</SelectItem>
                        <SelectItem value="ROLE:Support">👤 Support</SelectItem>
                      </>
                    )}
                    {teamMembers.length > 0 && <SelectItem value="separator" disabled>─────</SelectItem>}
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Days Input */}
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  value={task.due_offset_days || ''}
                  onChange={(e) => onUpdateTask(originalIndex, { due_offset_days: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Days"
                  className="h-9 border-0 shadow-none focus-visible:ring-1 text-center"
                  disabled={disabled}
                />
              </div>

              {/* Description Info Icon */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => {
                        if (disabled) return;
                        const desc = prompt('Task Description (optional):', task.description || '');
                        if (desc !== null) onUpdateTask(originalIndex, { description: desc });
                      }}
                      disabled={disabled}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">{task.description || 'Click to add description'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Delete Button */}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveTask(originalIndex)}
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="text-center py-4 border-2 border-dashed rounded-lg text-muted-foreground">
            <p className="text-sm">No tasks in this section</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

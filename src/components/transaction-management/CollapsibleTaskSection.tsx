import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2, Info, GripVertical, Pencil } from 'lucide-react';
import { TransactionTask } from './TransactionTaskBuilder';

// Color palette for sections - cycles through these
const SECTION_COLOR_PALETTE = [
  { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-l-blue-500' },
  { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-l-purple-500' },
  { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-l-red-500' },
  { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-l-green-500' },
  { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-l-orange-500' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-l-emerald-500' },
  { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', border: 'border-l-teal-500' },
  { bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-l-pink-500' },
  { bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-l-yellow-500' },
  { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-l-indigo-500' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-l-cyan-500' },
  { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-l-rose-500' },
];

// Get color based on section index
const getSectionColor = (index: number) => {
  return SECTION_COLOR_PALETTE[index % SECTION_COLOR_PALETTE.length];
};

interface CollapsibleTaskSectionProps {
  section: string;
  sectionIndex: number;
  tasks: (TransactionTask & { _originalIndex?: number })[];
  onUpdateTask: (originalIndex: number, updates: Partial<TransactionTask>) => void;
  onRemoveTask: (originalIndex: number) => void;
  onAddTask: () => void;
  onRenameSection: (oldName: string, newName: string) => void;
  onDeleteSection: (section: string) => void;
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
  sectionIndex,
  tasks,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  onRenameSection,
  onDeleteSection,
  teamMembers = [],
  isDefaultTemplate = false,
  disabled = false,
}: CollapsibleTaskSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const colors = getSectionColor(sectionIndex);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    const trimmed = editValue.trim().toUpperCase();
    if (trimmed && trimmed !== section) {
      onRenameSection(section, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditValue(section);
      setIsEditing(false);
    }
  };

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
          colors.border
        )}
      >
        <div className="flex items-center gap-3">
          <CollapsibleTrigger asChild>
            <button className="hover:opacity-80 transition-opacity">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          
          {isEditing && !disabled ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.toUpperCase())}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              className="h-7 w-48 font-semibold uppercase"
            />
          ) : (
            <button
              onClick={() => !disabled && setIsEditing(true)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1 rounded-md font-semibold text-sm',
                colors.bg, colors.text,
                !disabled && 'hover:opacity-80 cursor-pointer'
              )}
            >
              {section}
              {!disabled && <Pencil className="h-3 w-3 opacity-50" />}
            </button>
          )}
          
          <span className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
        
        {!disabled && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddTask}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
            {tasks.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteSection(section)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
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

              {/* Description Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      task.description ? "text-primary" : "text-muted-foreground"
                    )}
                    disabled={disabled}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-80" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Task Description</h4>
                    <Textarea
                      placeholder="Add an optional description for this task..."
                      value={task.description || ''}
                      onChange={(e) => onUpdateTask(originalIndex, { description: e.target.value })}
                      className="min-h-[80px] resize-none"
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      This description will be shown when agents view the task.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>

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

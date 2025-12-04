import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useState } from 'react';

export interface TransactionTask {
  title: string;
  section: string;
  description?: string;
  due_offset_days?: number;
  assigned_to_user?: string;  // specific user ID
  assigned_to_role?: string;  // role name like "Lead Agent"
  knowledge_base_article_id?: string;  // links to KB article for task instructions
}

interface TransactionTaskBuilderProps {
  tasks: TransactionTask[];
  onTasksChange: (tasks: TransactionTask[]) => void;
  teamMembers?: Array<{
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
  isDefaultTemplate?: boolean;
}

const TASK_SECTIONS = [
  'GETTING STARTED',
  'MARKETING',
  'LEGAL',
  'FINANCE',
  'DUE DILIGENCE',
  'SETTLEMENT',
  'HANDOVER',
  'CLIENT CARE',
  'ADMIN',
  'COMPLIANCE',
  'STRATA',
  'PLANNING',
  'PRICING',
  'VIEWINGS',
  'PROSPECTING',
  'TRACKING',
  'PREPARATION',
  'FOLLOW UP',
  'SCHEDULING',
  'SETUP',
  'COMMUNICATION',
  'REPORTING',
  'FINANCIAL',
];

const SECTION_COLORS: Record<string, string> = {
  'GETTING STARTED': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'MARKETING': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'LEGAL': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  'FINANCE': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'DUE DILIGENCE': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'SETTLEMENT': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'HANDOVER': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  'CLIENT CARE': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  'ADMIN': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  'COMPLIANCE': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
};

function SortableTask({ 
  task, 
  index, 
  onUpdate, 
  onRemove,
  teamMembers = [],
  isDefaultTemplate = false
}: { 
  task: TransactionTask; 
  index: number; 
  onUpdate: ((index: number, updates: Partial<TransactionTask>) => void) & ((index: number, field: keyof TransactionTask, value: any) => void);
  onRemove: (index: number) => void;
  teamMembers?: Array<{
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
  isDefaultTemplate?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-card border rounded-lg hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 p-2">
        {/* Drag Handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Title Input - 50% */}
        <div className="flex-[2]">
          <Input
            value={task.title}
            onChange={(e) => onUpdate(index, 'title', e.target.value)}
            placeholder="Task title..."
            className="h-9 border-0 shadow-none focus-visible:ring-1"
            required
          />
        </div>

        {/* Section Dropdown - 20% */}
        <div className="flex-1">
          <Select value={task.section} onValueChange={(value) => onUpdate(index, 'section', value)}>
            <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              {TASK_SECTIONS.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee Dropdown - 20% */}
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
                  onUpdate(index, { assigned_to_user: undefined, assigned_to_role: undefined });
                } else if (value.startsWith('ROLE:')) {
                  onUpdate(index, { assigned_to_user: undefined, assigned_to_role: value.replace('ROLE:', '') });
                } else {
                  onUpdate(index, { assigned_to_user: value, assigned_to_role: undefined });
                }
              }}
          >
            <SelectTrigger className="h-9 border-0 shadow-none focus:ring-1">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
              {teamMembers.length > 0 && <SelectItem value="separator" disabled>─────</SelectItem>}
              {isDefaultTemplate ? (
                <>
                  {/* Default/System templates - Only 2 core roles */}
                  <SelectItem value="ROLE:Salesperson">👤 Salesperson</SelectItem>
                  <SelectItem value="ROLE:Admin">👤 Admin</SelectItem>
                </>
              ) : (
                <>
                  {/* Custom templates - All 4 roles */}
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

        {/* Due Days Input - 15% */}
        <div className="w-20">
          <Input
            type="number"
            min="0"
            value={task.due_offset_days || ''}
            onChange={(e) => onUpdate(index, 'due_offset_days', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Days"
            className="h-9 border-0 shadow-none focus-visible:ring-1 text-center"
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
                  const desc = prompt('Task Description (optional):', task.description || '');
                  if (desc !== null) onUpdate(index, 'description', desc);
                }}
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function TransactionTaskBuilder({ tasks, onTasksChange, teamMembers = [], isDefaultTemplate = false }: TransactionTaskBuilderProps) {
  const [sortMode, setSortMode] = useState<'section' | 'timeline'>('section');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort tasks based on current sort mode
  const sortedTasks = useMemo(() => {
    if (sortMode === 'timeline') {
      return [...tasks].sort((a, b) => 
        (a.due_offset_days ?? 999) - (b.due_offset_days ?? 999)
      );
    }
    return tasks;
  }, [tasks, sortMode]);

  // Create a mapping from sorted index back to original index
  const sortedToOriginalIndex = useMemo(() => {
    return sortedTasks.map(sortedTask => tasks.indexOf(sortedTask));
  }, [sortedTasks, tasks]);

  const addTask = () => {
    onTasksChange([
      ...tasks,
      { title: '', section: 'GETTING STARTED', description: '', due_offset_days: undefined },
    ]);
  };

  const removeTask = (index: number) => {
    onTasksChange(tasks.filter((_, i) => i !== index));
  };

  // Overloaded function to support both single field and multiple field updates
  function updateTask(index: number, updates: Partial<TransactionTask>): void;
  function updateTask(index: number, field: keyof TransactionTask, value: any): void;
  function updateTask(index: number, fieldOrUpdates: keyof TransactionTask | Partial<TransactionTask>, value?: any): void {
    const updated = [...tasks];
    
    if (typeof fieldOrUpdates === 'object') {
      // Multiple fields: fieldOrUpdates is an object like { assigned_to_user: 'id', assigned_to_role: undefined }
      updated[index] = { ...updated[index], ...fieldOrUpdates };
    } else {
      // Single field: fieldOrUpdates is a string key
      updated[index] = { ...updated[index], [fieldOrUpdates]: value };
    }
    
    onTasksChange(updated);
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id.split('-')[1]);
      const newIndex = parseInt(over.id.split('-')[1]);
      onTasksChange(arrayMove(tasks, oldIndex, newIndex));
      
      // Switch back to section view after manual reordering
      if (sortMode === 'timeline') {
        setSortMode('section');
      }
    }
  };

  // Group tasks by section for visual reference
  const tasksBySection = tasks.reduce((acc, task) => {
    acc[task.section] = (acc[task.section] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{tasks.length} tasks</Badge>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button 
              type="button"
              variant={sortMode === 'section' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setSortMode('section')}
              className="h-7 text-xs"
            >
              By Section
            </Button>
            <Button 
              type="button"
              variant={sortMode === 'timeline' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setSortMode('timeline')}
              className="h-7 text-xs"
            >
              By Timeline
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTask}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Section badges when in section mode */}
      {sortMode === 'section' && Object.keys(tasksBySection).length > 0 && (
        <div className="flex flex-wrap gap-2 py-3 border-b">
          {Object.entries(tasksBySection).map(([section, count]) => (
            <Badge 
              key={section} 
              variant="outline"
              className={SECTION_COLORS[section] || 'bg-secondary'}
            >
              {section}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Column Headers */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-[auto,2fr,1fr,1fr,80px,auto,auto] gap-2 px-2 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          <div className="w-6"></div> {/* Drag handle */}
          <div>Task Title</div>
          <div>Section</div>
          <div>Assignee</div>
          <div className="text-center">Due Days</div>
          <div className="w-9"></div> {/* Info icon */}
          <div className="w-9"></div> {/* Delete */}
        </div>
      )}

      {/* Task list - scrollable */}
      <div className="flex-1 overflow-y-auto py-2">
        {tasks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg m-2">
            <p className="text-sm text-muted-foreground mb-3">No tasks yet</p>
            <Button type="button" variant="outline" size="sm" onClick={addTask}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Task
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedTasks.map((_, index) => `task-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedTasks.map((task, sortedIndex) => {
                  const originalIndex = sortedToOriginalIndex[sortedIndex];
                  return (
                    <SortableTask
                      key={`task-${sortedIndex}`}
                      task={task}
                      index={originalIndex}
                      onUpdate={updateTask}
                      onRemove={removeTask}
                      teamMembers={teamMembers}
                      isDefaultTemplate={isDefaultTemplate}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Timeline mode info banner */}
      {sortMode === 'timeline' && tasks.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Timeline sorting active. Drag to reorder will switch back to section view.
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react';
import { AppraisalTemplateTask } from '@/hooks/useAppraisalTemplates';
import { AppraisalSortableTask } from './AppraisalSortableTask';

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

interface AppraisalCollapsibleTaskSectionProps {
  section: string;
  sectionIndex: number;
  tasks: (AppraisalTemplateTask & { _originalIndex?: number })[];
  onUpdateTask: (originalIndex: number, updates: Partial<AppraisalTemplateTask>) => void;
  onRemoveTask: (originalIndex: number) => void;
  onAddTask: () => void;
  onRenameSection: (oldName: string, newName: string) => void;
  onDeleteSection: (section: string) => void;
  onReorderTasks: (oldIndex: number, newIndex: number, section: string) => void;
  disabled?: boolean;
}

export function AppraisalCollapsibleTaskSection({
  section,
  sectionIndex,
  tasks,
  onUpdateTask,
  onRemoveTask,
  onAddTask,
  onRenameSection,
  onDeleteSection,
  onReorderTasks,
  disabled = false,
}: AppraisalCollapsibleTaskSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
  
  const colors = getSectionColor(sectionIndex);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-focus new task input when added
  useEffect(() => {
    if (pendingFocusIndex !== null) {
      const timeout = setTimeout(() => {
        const targetRef = taskInputRefs.current[pendingFocusIndex];
        if (targetRef) {
          targetRef.focus();
        }
        setPendingFocusIndex(null);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [pendingFocusIndex, tasks.length]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => `task-${t._originalIndex}` === active.id);
      const newIndex = tasks.findIndex(t => `task-${t._originalIndex}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderTasks(oldIndex, newIndex, section);
      }
    }
  };

  const sortableIds = tasks.map(t => `task-${t._originalIndex}`);

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task, index) => (
              <AppraisalSortableTask
                key={`${section}-${task._originalIndex}`}
                task={task}
                index={index}
                onUpdateTask={onUpdateTask}
                onRemoveTask={onRemoveTask}
                onAddTask={onAddTask}
                setPendingFocusIndex={setPendingFocusIndex}
                tasksLength={tasks.length}
                disabled={disabled}
                inputRef={(el) => { taskInputRefs.current[index] = el; }}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-4 border-2 border-dashed rounded-lg text-muted-foreground">
            <p className="text-sm">No tasks in this section</p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

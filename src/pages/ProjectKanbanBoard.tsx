import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectLists } from '@/hooks/useProjectLists';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, MoreVertical, Trash2, Pencil, X, Clock, Check, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Column colors - 8 faint colors for column backgrounds
const COLUMN_COLORS = [
  { name: 'Slate', value: '#f1f5f9' },   // slate-100
  { name: 'Blue', value: '#dbeafe' },    // blue-100
  { name: 'Green', value: '#dcfce7' },   // green-100
  { name: 'Yellow', value: '#fef9c3' },  // yellow-100
  { name: 'Red', value: '#fee2e2' },     // red-100
  { name: 'Purple', value: '#f3e8ff' },  // purple-100
  { name: 'Pink', value: '#fce7f3' },    // pink-100
  { name: 'Teal', value: '#ccfbf1' },    // teal-100
];

// Card background colors - 8 darker/solid colors for card backgrounds
const CARD_COLORS = [
  { name: 'Slate', value: '#cbd5e1' },   // slate-300
  { name: 'Blue', value: '#93c5fd' },    // blue-300
  { name: 'Green', value: '#86efac' },   // green-300
  { name: 'Yellow', value: '#fde047' },  // yellow-300
  { name: 'Red', value: '#fca5a5' },     // red-300
  { name: 'Purple', value: '#d8b4fe' },  // purple-300
  { name: 'Pink', value: '#f9a8d4' },    // pink-300
  { name: 'Teal', value: '#5eead4' },    // teal-300
];

interface Assignee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  list_id: string | null;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  board_position: number | null;
  color: string | null;
  completed: boolean | null;
  assignees: Assignee[];
}

interface Project {
  id: string;
  title: string;
  icon: string;
  color: string;
}

// Sortable Task Card - Slimline Trello-style with full-card drag + inline editing
const SortableTaskCard = ({ 
  task, 
  onDelete,
  onToggleComplete,
  onColorChange,
  onUpdateTitle,
  onToggleAssignee,
  teamMembers,
  isOverBefore,
}: { 
  task: Task; 
  onDelete: () => void;
  onToggleComplete: () => void;
  onColorChange: (color: string | null) => void;
  onUpdateTitle: (title: string) => void;
  onToggleAssignee: (userId: string, isAdding: boolean) => void;
  teamMembers: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  isOverBefore?: boolean;
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const isCompleted = task.completed;

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle.trim() !== task.title) {
      onUpdateTitle(editedTitle.trim());
    } else {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTitleSave();
    }
    if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  // Determine if drag should be enabled (not when editing)
  const dragProps = isEditingTitle ? {} : { ...attributes, ...listeners };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative transition-all duration-200 ease-out",
        isDragging && 'z-50 opacity-30 scale-105',
      )}
      {...dragProps}
    >
      {/* Drop indicator line */}
      {isOverBefore && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-pulse shadow-[0_0_12px_4px_hsl(var(--primary)/0.6)] -translate-y-1 z-10" />
      )}
      
      <Card 
        className={cn(
          "group hover:shadow-md transition-all duration-200 overflow-hidden",
          !isEditingTitle && "cursor-grab active:cursor-grabbing",
          isCompleted && "opacity-60"
        )}
        style={{ backgroundColor: task.color || undefined }}
      >
        <CardContent className="px-2.5 py-2">
          <div className="flex items-start gap-2">
            {/* Left column: checkbox + avatars */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {/* Completion checkbox */}
              <button 
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleComplete(); }}
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center",
                  isCompleted 
                    ? "bg-emerald-500 border-emerald-500" 
                    : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
                )}
              >
                {isCompleted && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </button>

              {/* Stacked assignee avatars below checkbox */}
              {task.assignees && task.assignees.length > 0 && (
                <div className="flex flex-col -space-y-1 mt-0.5">
                  {task.assignees.slice(0, 3).map((assignee) => (
                    <Avatar key={assignee.id} className="h-5 w-5 border-2 border-background">
                      <AvatarImage src={assignee.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {assignee.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {task.assignees.length > 3 && (
                    <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-medium">
                      +{task.assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title row with dropdown */}
              <div className="flex items-start justify-between gap-1">
                {isEditingTitle ? (
                  <textarea
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm leading-tight bg-background border rounded px-1.5 py-0.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[24px]"
                    rows={1}
                    style={{ height: 'auto' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                ) : (
                  <p 
                    className={cn(
                      "text-sm leading-tight flex-1 cursor-text hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
                      isCompleted && "line-through text-muted-foreground"
                    )}
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                  >
                    {task.title}
                  </p>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 flex-shrink-0 -mr-1 -mt-0.5">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Color Picker */}
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-2">Card color</p>
                      <div className="flex gap-1 flex-wrap">
                        {/* Clear color button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onColorChange(null); }}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 border-dashed border-muted-foreground/50 transition-all hover:scale-110 flex items-center justify-center",
                            !task.color && "ring-2 ring-primary ring-offset-1"
                          )}
                          title="No color"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                        {CARD_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={(e) => { e.stopPropagation(); onColorChange(color.value); }}
                            className={cn(
                              "w-5 h-5 rounded-full border-2 transition-all hover:scale-110",
                              task.color === color.value && "ring-2 ring-primary ring-offset-1"
                            )}
                            style={{ backgroundColor: color.value || undefined }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {/* Assignee Section - Multi-select */}
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground mb-2">Assignees</p>
                      <div className="max-h-32 overflow-auto space-y-0.5">
                        {/* Team members */}
                        {teamMembers.map((member) => {
                          const isAssigned = task.assignees?.some(a => a.id === member.id);
                          return (
                            <button 
                              key={member.id}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onToggleAssignee(member.id, !isAssigned); 
                              }}
                              className={cn(
                                "flex items-center gap-2 w-full p-1.5 rounded hover:bg-muted text-left",
                                isAssigned && "bg-primary/10"
                              )}
                            >
                              <Avatar className="h-5 w-5 flex-shrink-0">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-[9px]">
                                  {member.full_name?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">{member.full_name || 'Unknown'}</span>
                              {isAssigned && <Check className="h-3 w-3 text-primary ml-auto flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Due date - right aligned */}
              {task.due_date && (
                <div className="flex items-center justify-end mt-1">
                  <span className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    isOverdue && 'text-destructive',
                    isDueToday && 'text-amber-600',
                    !isOverdue && !isDueToday && 'text-muted-foreground',
                  )}>
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.due_date), 'd MMM')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Inline Add Card Component (Trello-style)
const InlineAddCard = ({ 
  onAdd, 
  isExpanded, 
  onExpand, 
  onCollapse 
}: { 
  onAdd: (title: string) => void;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) => {
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setTitle('');
      onCollapse();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onExpand}
        className="w-full p-2 text-sm text-foreground/70 hover:text-foreground hover:bg-black/10 rounded-lg text-left flex items-center gap-2 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add a card
      </button>
    );
  }

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <Textarea
        ref={textareaRef}
        placeholder="Enter a title for this card..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[68px] resize-none text-sm"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
          Add card
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setTitle(''); onCollapse(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Sortable Column
const SortableColumn = ({ 
  list, 
  tasks, 
  projectId,
  onAddTask,
  onRenameList,
  onDeleteList,
  onToggleComplete,
  onColorChange,
  onUpdateTitle,
  onToggleAssignee,
  onDeleteTask,
  teamMembers,
  overTaskId,
  isCollapsed,
  onToggleCollapse,
  onColumnColorChange,
}: {
  list: any; 
  tasks: Task[];
  projectId: string;
  onAddTask: (title: string, listId: string) => void;
  onRenameList: (newName: string) => void;
  onDeleteList: () => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onColorChange: (taskId: string, color: string | null) => void;
  onUpdateTitle: (taskId: string, title: string) => void;
  onToggleAssignee: (taskId: string, userId: string, isAdding: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  teamMembers: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  overTaskId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onColumnColorChange: (color: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'column', list },
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedName, setEditedName] = useState(list.name);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Separate active and completed tasks
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    if (editedName.trim() && editedName.trim() !== list.name) {
      onRenameList(editedName.trim());
    } else {
      setEditedName(list.name);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    }
    if (e.key === 'Escape') {
      setEditedName(list.name);
      setIsEditingTitle(false);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Collapsed column view - stretches to full height like a barrier
  if (isCollapsed) {
    return (
      <div 
        ref={setNodeRef} 
        style={{
          ...style,
          backgroundColor: list.color || undefined,
        }}
        className={cn(
          "w-10 flex-shrink-0 flex flex-col rounded-lg h-full cursor-pointer hover:opacity-80 transition-opacity",
          !list.color && "bg-muted/30",
          isDragging && 'opacity-50'
        )}
        onClick={onToggleCollapse}
      >
        <div className="p-2 flex flex-col items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {tasks.length}
          </Badge>
          <span 
            className="font-medium text-xs whitespace-nowrap origin-center"
            style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
            }}
          >
            {list.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        backgroundColor: list.color || undefined,
      }}
      className={cn(
        "w-56 flex-shrink-0 flex flex-col rounded-lg max-h-full",
        !list.color && "bg-muted/30",
        isDragging && 'opacity-50'
      )}
    >
      {/* Column Header */}
      <div 
        className="p-2 border-b border-black/10 flex items-center gap-1.5"
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab' }}
      >
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="h-6 flex-1 font-medium text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className="font-medium text-xs flex-1 truncate cursor-text hover:bg-black/5 px-1 py-0.5 -mx-1 rounded transition-colors"
            onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
          >
            {list.name}
          </span>
        )}
        
        <Badge variant="secondary" className="flex-shrink-0 text-[10px] px-1 py-0">
          {activeTasks.length}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Color Picker Section - Single row of 8 faint colors */}
            <div className="p-2">
              <p className="text-xs text-muted-foreground mb-2">Column color</p>
              <div className="flex gap-1">
                {COLUMN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={(e) => { e.stopPropagation(); onColumnColorChange(c.value); }}
                    className={cn(
                      "w-5 h-5 rounded border border-black/10 hover:scale-110 transition-transform",
                      list.color === c.value && "ring-2 ring-primary ring-offset-1"
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleCollapse}>
              <PanelLeftClose className="h-4 w-4 mr-2" />
              Collapse
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteList} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-auto p-1.5 space-y-1.5">
        <SortableContext
          items={activeTasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeTasks.map((task) => {
            const showIndicator = overTaskId === task.id;
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                onDelete={() => onDeleteTask(task.id)}
                onToggleComplete={() => onToggleComplete(task.id, !task.completed)}
                onColorChange={(color) => onColorChange(task.id, color)}
                onUpdateTitle={(title) => onUpdateTitle(task.id, title)}
                onToggleAssignee={(userId, isAdding) => onToggleAssignee(task.id, userId, isAdding)}
                teamMembers={teamMembers}
                isOverBefore={showIndicator}
              />
            );
          })}
        </SortableContext>

        {/* Inline Add Card (Trello-style) */}
        <InlineAddCard
          onAdd={(title) => onAddTask(title, list.id)}
          isExpanded={isAdding}
          onExpand={() => setIsAdding(true)}
          onCollapse={() => setIsAdding(false)}
        />

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <div className="pt-2 mt-2 border-t border-muted-foreground/20">
            <button
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {showCompletedSection ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>Completed ({completedTasks.length})</span>
            </button>
            
            {showCompletedSection && (
              <div className="space-y-1.5 mt-1.5">
                <SortableContext
                  items={completedTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {completedTasks.map((task) => {
                    const showIndicator = overTaskId === task.id;
                    return (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onDelete={() => onDeleteTask(task.id)}
                        onToggleComplete={() => onToggleComplete(task.id, !task.completed)}
                        onColorChange={(color) => onColorChange(task.id, color)}
                        onUpdateTitle={(title) => onUpdateTitle(task.id, title)}
                        onToggleAssignee={(userId, isAdding) => onToggleAssignee(task.id, userId, isAdding)}
                        teamMembers={teamMembers}
                        isOverBefore={showIndicator}
                      />
                    );
                  })}
                </SortableContext>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Ghost Column for adding new lists (Trello-style)
const AddColumnPlaceholder = ({ 
  onCreate 
}: { 
  onCreate: (name: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    }
    if (e.key === 'Escape') {
      setName('');
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-56 flex-shrink-0 p-2 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 text-sm"
      >
        <Plus className="h-4 w-4" />
        Add list
      </button>
    );
  }

  return (
    <div className="w-56 flex-shrink-0 p-2 rounded-lg bg-muted/30 space-y-2 animate-in fade-in slide-in-from-right-4 duration-200">
      <Input
        ref={inputRef}
        placeholder="Enter list name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-background h-8 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleCreate} disabled={!name.trim()} className="h-7 text-xs">
          Add list
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => { setName(''); setIsExpanded(false); }}
          className="h-7"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default function ProjectKanbanBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'task' | 'column' | null>(null);
  const [overTaskId, setOverTaskId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    if (projectId) {
      const stored = localStorage.getItem(`kanban-collapsed-${projectId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  
  // Persist collapsed columns to localStorage
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`kanban-collapsed-${projectId}`, JSON.stringify([...collapsedColumns]));
    }
  }, [collapsedColumns, projectId]);
  
  // List management dialogs
  const [editListId, setEditListId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [listColor, setListColor] = useState('#3b82f6');

  const toggleColumnCollapse = (listId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  const { lists, isLoading: listsLoading, createList, updateList, deleteList, reorderLists, createDefaultLists } = useProjectLists(projectId);
  const { members: teamMembers } = useTeamMembers();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('id, title, icon, color')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });

  // Fetch tasks for this project with multiple assignees from task_assignees
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, list_id, priority, due_date, project_id, board_position, color, completed,
          task_assignees(
            user_id,
            profiles:user_id(id, full_name, avatar_url)
          )
        `)
        .eq('project_id', projectId)
        .order('board_position', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      // Map task_assignees to flat assignees array
      return (data || []).map((t: any) => ({
        ...t,
        assignees: t.task_assignees?.map((ta: any) => ({
          id: ta.profiles?.id,
          full_name: ta.profiles?.full_name,
          avatar_url: ta.profiles?.avatar_url,
        })).filter((a: any) => a.id) || [],
      })) as Task[];
    },
    enabled: !!projectId,
  });

  // Create default lists if none exist
  useEffect(() => {
    if (!listsLoading && lists.length === 0 && projectId) {
      createDefaultLists(projectId);
    }
  }, [listsLoading, lists.length, projectId]);

  // Group tasks by list_id
  const tasksByList = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    lists.forEach(list => { grouped[list.id] = []; });
    tasks.forEach(task => {
      if (task.list_id && grouped[task.list_id]) {
        grouped[task.list_id].push(task);
      } else if (lists.length > 0) {
        grouped[lists[0].id]?.push(task);
      }
    });
    return grouped;
  }, [tasks, lists]);

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async ({ title, listId }: { title: string; listId: string }) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      // Get max position in the target list
      const listTasks = tasksByList[listId] || [];
      const maxPosition = listTasks.length > 0 
        ? Math.max(...listTasks.map(t => t.board_position || 0)) + 1 
        : 0;

      const { error } = await supabase.from('tasks').insert({
        title,
        list_id: listId,
        project_id: projectId,
        team_id: teamData?.team_id,
        created_by: user!.id,
        board_position: maxPosition,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Failed to add task'),
  });

  // Toggle task completion
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed, 
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  // Update task color
  const updateTaskColorMutation = useMutation({
    mutationFn: async ({ taskId, color }: { taskId: string; color: string | null }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ color })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  // Update task title
  const updateTaskTitleMutation = useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  // Toggle assignee mutation (add/remove from task_assignees)
  const toggleAssigneeMutation = useMutation({
    mutationFn: async ({ taskId, userId, isAdding }: { taskId: string; userId: string; isAdding: boolean }) => {
      if (isAdding) {
        const { error } = await supabase
          .from('task_assignees')
          .insert({ task_id: taskId, user_id: userId, assigned_by: user?.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: () => toast.error('Failed to update assignee'),
  });

  // Update task positions mutation (batch)
  const updateTaskPositionsMutation = useMutation({
    mutationFn: async (updates: { id: string; list_id: string; board_position: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('tasks')
          .update({ list_id: update.list_id, board_position: update.board_position })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: () => toast.error('Failed to update task positions'),
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const type = event.active.data.current?.type;
    setActiveId(event.active.id as string);
    setActiveType(type || 'task');
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    
    if (!over) {
      setOverTaskId(null);
      return;
    }

    // Only show indicator when hovering over a task
    const overType = over.data.current?.type;
    if (overType === 'task') {
      setOverTaskId(over.id as string);
    } else {
      setOverTaskId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    setOverTaskId(null);
    
    if (!over) return;

    const activeType = active.data.current?.type;

    // Handle column reordering
    if (activeType === 'column') {
      const oldIndex = lists.findIndex(l => l.id === active.id);
      const newIndex = lists.findIndex(l => l.id === over.id);
      
      if (oldIndex !== newIndex && newIndex !== -1) {
        const newOrder = arrayMove(lists, oldIndex, newIndex);
        await reorderLists(newOrder.map(l => l.id));
      }
      return;
    }

    // Handle task movement
    const taskId = active.id as string;
    const activeTask = tasks.find(t => t.id === taskId);
    if (!activeTask) return;

    let targetListId: string;
    let targetPosition: number;

    // Check if dropped on a column
    const targetList = lists.find(l => l.id === over.id);
    if (targetList) {
      // Dropped on column itself - add to end
      targetListId = targetList.id;
      const listTasks = tasksByList[targetListId] || [];
      targetPosition = listTasks.length;
    } else {
      // Dropped on/near a task
      const overTask = tasks.find(t => t.id === over.id);
      if (!overTask) return;
      
      targetListId = overTask.list_id || lists[0]?.id;
      if (!targetListId) return;

      const listTasks = [...(tasksByList[targetListId] || [])];
      const overIndex = listTasks.findIndex(t => t.id === over.id);
      targetPosition = overIndex >= 0 ? overIndex : listTasks.length;
    }

    // Build new task order for target list
    const targetListTasks = [...(tasksByList[targetListId] || [])];
    
    // Remove task from source position if same list
    if (activeTask.list_id === targetListId) {
      const oldIndex = targetListTasks.findIndex(t => t.id === taskId);
      if (oldIndex !== -1) {
        targetListTasks.splice(oldIndex, 1);
        // Adjust target position if we're moving down in the same list
        if (oldIndex < targetPosition) {
          targetPosition--;
        }
      }
    }

    // Insert at new position
    targetListTasks.splice(targetPosition, 0, activeTask);

    // Create position updates
    const updates = targetListTasks.map((task, index) => ({
      id: task.id,
      list_id: targetListId,
      board_position: index,
    }));

    // If moving from another list, we don't need to update that list's positions
    // since the original positions remain valid
    await updateTaskPositionsMutation.mutateAsync(updates);
  };

  // Create list inline
  const handleCreateListInline = async (name: string) => {
    if (!projectId) return;
    await createList({ 
      name, 
      color: '#3b82f6',
      project_id: projectId 
    });
  };

  const handleUpdateList = async () => {
    if (!listName.trim() || !editListId) return;
    await updateList({ 
      id: editListId, 
      updates: { name: listName.trim(), color: listColor }
    });
    setEditListId(null);
    setListName('');
    setListColor('#3b82f6');
  };

  const handleConfirmDeleteList = async () => {
    if (!deleteListId) return;
    await deleteList(deleteListId);
    setDeleteListId(null);
  };

  const openEditDialog = (list: any) => {
    setEditListId(list.id);
    setListName(list.name);
    setListColor(list.color || '#3b82f6');
  };

  const isLoading = listsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeTask = activeType === 'task' ? tasks.find(t => t.id === activeId) : null;
  const activeList = activeType === 'column' ? lists.find(l => l.id === activeId) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            {project && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{project.icon}</span>
                <h1 className="text-xl font-semibold">{project.title}</h1>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full min-w-max items-stretch">
            <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <SortableColumn
                  key={list.id}
                  list={list}
                  tasks={tasksByList[list.id] || []}
                  projectId={projectId!}
                  onAddTask={(title, listId) => addTaskMutation.mutate({ title, listId })}
                  onRenameList={(newName) => updateList({ id: list.id, updates: { name: newName } })}
                  onDeleteList={() => setDeleteListId(list.id)}
                  onToggleComplete={(taskId, completed) => toggleCompleteMutation.mutate({ taskId, completed })}
                  onColorChange={(taskId, color) => updateTaskColorMutation.mutate({ taskId, color })}
                  onUpdateTitle={(taskId, title) => updateTaskTitleMutation.mutate({ taskId, title })}
                  onToggleAssignee={(taskId, userId, isAdding) => toggleAssigneeMutation.mutate({ taskId, userId, isAdding })}
                  onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                  teamMembers={teamMembers}
                  overTaskId={overTaskId}
                  isCollapsed={collapsedColumns.has(list.id)}
                  onToggleCollapse={() => toggleColumnCollapse(list.id)}
                  onColumnColorChange={(color) => updateList({ id: list.id, updates: { color } })}
                />
              ))}
            </SortableContext>

            {/* Ghost Column for adding new lists */}
            <AddColumnPlaceholder onCreate={handleCreateListInline} />
          </div>

          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeTask && (
              <Card className="w-56 shadow-2xl rotate-3 scale-105 border-2 border-primary/30 bg-background overflow-hidden">
                <CardContent className="px-2 py-1.5">
                  <p 
                    className="font-medium text-xs"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {activeTask.title}
                  </p>
                </CardContent>
              </Card>
            )}
            {activeList && (
              <div className="w-56 h-24 bg-muted rounded-lg shadow-2xl rotate-2 flex items-center justify-center border-2 border-primary/30">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: activeList.color || '#3b82f6' }}
                  />
                  <p className="font-semibold text-sm">{activeList.name}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit List Dialog */}
      <Dialog open={!!editListId} onOpenChange={(open) => !open && setEditListId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Column name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateList()}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLUMN_COLORS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setListColor(option.value)}
                    className="w-6 h-6 rounded border border-black/10 transition-all hover:scale-110"
                    style={{
                      backgroundColor: option.value,
                      boxShadow: listColor === option.value ? '0 0 0 2px hsl(var(--primary))' : 'none',
                    }}
                    title={option.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditListId(null)}>Cancel</Button>
            <Button onClick={handleUpdateList} disabled={!listName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete List Confirmation */}
      <AlertDialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks in this column will be moved to the first column. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteList}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

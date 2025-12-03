import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectLists } from '@/hooks/useProjectLists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, GripVertical, MoreVertical, Trash2, Edit, Pencil, X } from 'lucide-react';
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

const COLOR_OPTIONS = [
  { name: 'Slate', value: '#64748b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  list_id: string | null;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  project_id: string | null;
  board_position: number | null;
  assignee?: { full_name: string | null; avatar_url: string | null };
}

interface Project {
  id: string;
  title: string;
  icon: string;
  color: string;
}

// Sortable Task Card with drop indicator
const SortableTaskCard = ({ 
  task, 
  onEdit, 
  onDelete,
  isOverBefore,
}: { 
  task: Task; 
  onEdit: () => void; 
  onDelete: () => void;
  isOverBefore?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative transition-all duration-200 ease-out",
        isDragging && 'z-50 opacity-30 scale-105',
      )}
    >
      {/* Drop indicator line */}
      {isOverBefore && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-pulse shadow-[0_0_12px_4px_hsl(var(--primary)/0.6)] -translate-y-1 z-10" />
      )}
      
      <Card className="group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div {...attributes} {...listeners} className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm truncate">{task.title}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {task.priority && (
                  <Badge variant="outline" className={cn(
                    'text-xs',
                    task.priority === 'high' && 'border-red-500 text-red-500',
                    task.priority === 'medium' && 'border-amber-500 text-amber-500',
                    task.priority === 'low' && 'border-green-500 text-green-500',
                  )}>
                    {task.priority}
                  </Badge>
                )}

                {task.due_date && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs',
                      isOverdue && 'border-destructive text-destructive',
                      isDueToday && 'border-amber-500 text-amber-500',
                    )}
                  >
                    {format(new Date(task.due_date), 'MMM d')}
                  </Badge>
                )}

                {task.assignee && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
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
        className="w-full p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg text-left flex items-center gap-2 transition-colors"
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
  onEditList,
  onDeleteList,
  overTaskId,
}: { 
  list: any; 
  tasks: Task[];
  projectId: string;
  onAddTask: (title: string, listId: string) => void;
  onEditList: () => void;
  onDeleteList: () => void;
  overTaskId: string | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'column', list },
  });
  const [isAdding, setIsAdding] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg max-h-full",
        isDragging && 'opacity-50'
      )}
    >
      {/* Column Header */}
      <div 
        {...attributes}
        {...listeners}
        className="p-3 border-b flex items-center gap-2 cursor-grab active:cursor-grabbing"
      >
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: list.color || '#3b82f6' }}
        />
        <span className="font-medium flex-1 truncate">{list.name}</span>
        <Badge variant="secondary" className="flex-shrink-0">
          {tasks.length}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditList}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
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
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, index) => {
            // Show drop indicator before this task if it's being hovered
            const showIndicator = overTaskId === task.id;
            return (
              <SortableTaskCard
                key={task.id}
                task={task}
                onEdit={() => toast.info('Edit task coming soon')}
                onDelete={() => {}}
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
      // Keep expanded for adding multiple columns quickly
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
        className="w-80 flex-shrink-0 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add another list
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 p-3 rounded-lg bg-muted/30 space-y-2 animate-in fade-in slide-in-from-right-4 duration-200">
      <Input
        ref={inputRef}
        placeholder="Enter list name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-background"
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>
          Add list
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => { setName(''); setIsExpanded(false); }}
        >
          <X className="h-4 w-4" />
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
  
  // List management dialogs
  const [editListId, setEditListId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [listColor, setListColor] = useState('#3b82f6');

  const { lists, isLoading: listsLoading, createList, updateList, deleteList, reorderLists, createDefaultLists } = useProjectLists(projectId);

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

  // Fetch tasks for this project
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, list_id, priority, due_date, assigned_to, project_id, board_position,
          assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('board_position', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        assignee: t.assignee?.[0] || null,
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
          <div className="flex gap-4 h-full min-w-max items-start">
            <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <SortableColumn
                  key={list.id}
                  list={list}
                  tasks={tasksByList[list.id] || []}
                  projectId={projectId!}
                  onAddTask={(title, listId) => addTaskMutation.mutate({ title, listId })}
                  onEditList={() => openEditDialog(list)}
                  onDeleteList={() => setDeleteListId(list.id)}
                  overTaskId={overTaskId}
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
              <Card className="w-80 shadow-2xl rotate-3 scale-105 border-2 border-primary/30 bg-background">
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{activeTask.title}</p>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{activeTask.description}</p>
                  )}
                </CardContent>
              </Card>
            )}
            {activeList && (
              <div className="w-80 h-32 bg-muted rounded-lg shadow-2xl rotate-2 flex items-center justify-center border-2 border-primary/30">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: activeList.color || '#3b82f6' }}
                  />
                  <p className="font-semibold">{activeList.name}</p>
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
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setListColor(option.value)}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: option.value,
                      borderColor: listColor === option.value ? 'hsl(var(--primary))' : 'transparent',
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

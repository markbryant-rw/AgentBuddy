import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjectLists } from '@/hooks/useProjectLists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, GripVertical, MoreVertical, Trash2, Edit, Pencil } from 'lucide-react';
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
  assignee?: { full_name: string | null; avatar_url: string | null };
}

interface Project {
  id: string;
  title: string;
  icon: string;
  color: string;
}

// Sortable Task Card
const SortableTaskCard = ({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50')}>
      <Card className="group cursor-grab active:cursor-grabbing hover:shadow-md transition-all">
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

// Sortable Column
const SortableColumn = ({ 
  list, 
  tasks, 
  projectId,
  onAddTask,
  onEditList,
  onDeleteList,
}: { 
  list: any; 
  tasks: Task[];
  projectId: string;
  onAddTask: (title: string, listId: string) => void;
  onEditList: () => void;
  onDeleteList: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'column', list },
  });
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSubmit = () => {
    if (title.trim()) {
      onAddTask(title.trim(), list.id);
      setTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg",
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
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={() => toast.info('Edit task coming soon')}
              onDelete={() => {}}
            />
          ))}
        </SortableContext>

        {/* Add Task */}
        {isAdding ? (
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') {
                  setTitle('');
                  setIsAdding(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTitle(''); setIsAdding(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
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
  
  // List management dialogs
  const [createListOpen, setCreateListOpen] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [listColor, setListColor] = useState('#3b82f6');

  const { lists, isLoading: listsLoading, createList, updateList, deleteList, reorderLists, createDefaultLists } = useProjectLists(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
          id, title, description, status, list_id, priority, due_date, assigned_to, project_id,
          assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('board_position', { ascending: true });
      
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
        // Tasks without list_id go to first list
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

      const { error } = await supabase.from('tasks').insert({
        title,
        list_id: listId,
        project_id: projectId,
        team_id: teamData?.team_id,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Failed to add task'),
  });

  // Update task list mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, listId }: { taskId: string; listId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ list_id: listId })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: () => toast.error('Failed to update task'),
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    
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
    let targetListId: string | null = null;

    // Check if dropped on a column
    const targetList = lists.find(l => l.id === over.id);
    if (targetList) {
      targetListId = targetList.id;
    } else {
      // Dropped on a task - find which list that task belongs to
      const targetTask = tasks.find(t => t.id === over.id);
      if (targetTask) {
        targetListId = targetTask.list_id;
      }
    }

    if (targetListId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.list_id !== targetListId) {
        updateTaskMutation.mutate({ taskId, listId: targetListId });
      }
    }
  };

  // List dialog handlers
  const handleCreateList = async () => {
    if (!listName.trim() || !projectId) return;
    await createList({ 
      name: listName.trim(), 
      color: listColor,
      project_id: projectId 
    });
    setListName('');
    setListColor('#3b82f6');
    setCreateListOpen(false);
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
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
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
                />
              ))}
            </SortableContext>

            {/* Add Column Button */}
            <Button
              variant="outline"
              className="w-80 h-fit flex-shrink-0 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={() => setCreateListOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </div>

          <DragOverlay>
            {activeTask && (
              <Card className="w-80 shadow-lg rotate-3">
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{activeTask.title}</p>
                </CardContent>
              </Card>
            )}
            {activeList && (
              <div className="w-80 h-32 bg-muted rounded-lg shadow-lg rotate-2 flex items-center justify-center border-2 border-primary">
                <p className="font-semibold">{activeList.name}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create List Dialog */}
      <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., To Do, In Progress, Done"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
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
            <Button variant="outline" onClick={() => setCreateListOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateList} disabled={!listName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

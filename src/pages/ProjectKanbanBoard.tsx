import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, GripVertical, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const KANBAN_COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'in_review', label: 'In Review', color: 'bg-amber-500' },
  { id: 'done', label: 'Done', color: 'bg-green-500' },
];

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
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

// Add Task Input
const AddTaskInput = ({ columnId, projectId, onAdd }: { columnId: string; projectId: string; onAdd: (title: string, status: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), columnId);
      setTitle('');
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add task
      </Button>
    );
  }

  return (
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
  );
};

export default function ProjectKanbanBoard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, priority, due_date, assigned_to, project_id,
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

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    KANBAN_COLUMNS.forEach(col => { grouped[col.id] = []; });
    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async ({ title, status }: { title: string; status: string }) => {
      const { data: teamData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id)
        .single();

      const { error } = await supabase.from('tasks').insert({
        title,
        status,
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

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, completed: status === 'done' })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
    const task = event.active.data.current?.task;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === overId);
    if (targetColumn) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== targetColumn.id) {
        updateTaskMutation.mutate({ taskId, status: targetColumn.id });
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === overId);
    
    // Also allow dropping on another task's column
    if (!targetColumn) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        const task = tasks.find(t => t.id === active.id);
        if (task && task.status !== overTask.status) {
          // Optimistic update could go here
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map((column) => (
              <div
                key={column.id}
                className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg"
              >
                {/* Column Header */}
                <div className="p-3 border-b flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', column.color)} />
                  <span className="font-medium">{column.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {tasksByStatus[column.id]?.length || 0}
                  </Badge>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  <SortableContext
                    items={tasksByStatus[column.id]?.map(t => t.id) || []}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    {tasksByStatus[column.id]?.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => toast.info('Edit task coming soon')}
                        onDelete={() => deleteTaskMutation.mutate(task.id)}
                      />
                    ))}
                  </SortableContext>

                  {/* Add Task */}
                  <AddTaskInput
                    columnId={column.id}
                    projectId={projectId!}
                    onAdd={(title, status) => addTaskMutation.mutate({ title, status })}
                  />
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <Card className="w-80 shadow-lg rotate-3">
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{activeTask.title}</p>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

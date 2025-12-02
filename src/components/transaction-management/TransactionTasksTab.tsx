import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { TaskSection } from './TaskSection';
import { AddTaskDialog } from './AddTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { TemplateSelector } from './TemplateSelector';
import { DefaultTemplatePrompt } from './DefaultTemplatePrompt';
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

interface TransactionTasksTabProps {
  transaction: {
    id: string;
    stage: string;
  };
  onTasksUpdate?: () => void;
}

export const TransactionTasksTab = ({ transaction, onTasksUpdate }: TransactionTasksTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [hideCompleted, setHideCompleted] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['transaction-tasks', transaction.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(`
          *,
          assignee:assigned_to(id, full_name, avatar_url)
        `)
        .eq('transaction_id', transaction.id)
        .is('list_id', null)
        .is('project_id', null)
        .order('daily_position', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const newCompleted = !task?.completed;
      
      const { error } = await supabase
        .from('tasks')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onTasksUpdate?.();
    },
  });

  const createTask = useMutation({
    mutationFn: async (newTask: any) => {
      const maxOrder = Math.max(0, ...tasks.map(t => t.daily_position || 0));
      
      // Get user's team_id
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('primary_team_id')
        .eq('id', user?.id)
        .single();
      
      const { error } = await (supabase as any)
        .from('tasks')
        .insert({
          transaction_id: transaction.id,
          title: newTask.title,
          description: newTask.description,
          transaction_stage: transaction.stage,
          due_date: newTask.due_date,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to || user?.id,
          created_by: user?.id,
          team_id: profile?.primary_team_id || '',
          daily_position: maxOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Task added');
      onTasksUpdate?.();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, updates }: { 
      taskId: string; 
      updates: {
        title: string;
        description?: string;
        due_date?: string | null;
        priority?: string;
        assigned_to?: string | null;
      }
    }) => {
      const { error } = await (supabase as any)
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Task updated');
      onTasksUpdate?.();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await (supabase as any)
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Task deleted');
      onTasksUpdate?.();
    },
  });

  // Predefined template sections for consistency
  const TEMPLATE_SECTIONS = [
    'GETTING STARTED', 'MARKETING', 'LEGAL', 'FINANCE', 'DUE DILIGENCE',
    'SETTLEMENT', 'HANDOVER', 'CLIENT CARE', 'ADMIN', 'COMPLIANCE',
    'STRATA', 'PLANNING', 'PRICING', 'VIEWINGS', 'PROSPECTING',
    'TRACKING', 'PREPARATION', 'FOLLOW UP', 'SCHEDULING', 'SETUP',
    'COMMUNICATION', 'REPORTING', 'FINANCIAL'
  ];

  const tasksBySection = useMemo(() => {
    if (!tasks) return {};
    
    // Filter tasks based on hideCompleted toggle
    const visibleTasks = hideCompleted 
      ? tasks.filter(t => !t.completed)
      : tasks;
    
    const sections: Record<string, typeof tasks> = { 'General': [] };
    
    visibleTasks.forEach(task => {
      const section = 'General'; // All tasks in General since 'section' column doesn't exist
      sections[section].push(task);
    });
    
    // Remove empty sections
    Object.keys(sections).forEach(section => {
      if (sections[section].length === 0) {
        delete sections[section];
      }
    });
    
    return sections;
  }, [tasks, hideCompleted]);

  const existingSections = useMemo(() => {
    const used = Object.keys(tasksBySection).filter(s => s !== 'General');
    return [...new Set([...TEMPLATE_SECTIONS, ...used])];
  }, [tasksBySection]);

  // Fetch team members for task assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-tasks', transaction.id],
    queryFn: async () => {
      const { data: tx } = await supabase
        .from('transactions')
        .select('team_id')
        .eq('id', transaction.id)
        .single();
      
      if (!tx?.team_id) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('team_id', tx.team_id);
      
      if (error) throw error;
      return data || [];
    },
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleEdit = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <TemplateSelector
                stage={transaction.stage as any}
                transactionId={transaction.id}
              />
            )}
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
          
          {tasks.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {completedCount} of {tasks.length} complete
              </div>
              <Button
                variant={hideCompleted ? "default" : "outline"}
                size="sm"
                onClick={() => setHideCompleted(!hideCompleted)}
              >
                {hideCompleted ? "Show Completed" : "Hide Completed"}
              </Button>
            </div>
          )}
        </div>

        {tasks.length > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            {progressPercent === 100 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                All tasks complete!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        {tasks.length === 0 ? (
          <div className="p-8">
            <DefaultTemplatePrompt
              stage={transaction.stage as any}
              transactionId={transaction.id}
              onTemplateApplied={() => {
                queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                onTasksUpdate?.();
              }}
            />
          </div>
        ) : (
          <div className="p-4">
            {Object.entries(tasksBySection).map(([section, sectionTasks]) => (
              <TaskSection
                key={section}
                title={section}
                tasks={sectionTasks}
                onToggle={(id) => toggleTask.mutate(id)}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteTaskId(id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(task) => createTask.mutate(task)}
        existingSections={existingSections}
        teamMembers={teamMembers}
      />

      <EditTaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
        onSubmit={(taskId, updates) => updateTask.mutate({ taskId, updates })}
        existingSections={existingSections}
        teamMembers={teamMembers}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) deleteTask.mutate(deleteTaskId);
                setDeleteTaskId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

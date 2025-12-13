import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ListTodo,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAppraisalTasks } from '@/hooks/useAppraisalTasks';
import { useAppraisalTemplates, AppraisalStage } from '@/hooks/useAppraisalTemplates';
import { AppraisalTemplatePromptDialog } from './AppraisalTemplatePromptDialog';
import { AppraisalTaskAssignee } from './AppraisalTaskAssignee';
import { UnifiedTaskList, UnifiedTask } from '@/components/tasks/UnifiedTaskList';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AppraisalTasksTabProps {
  appraisalId: string;
  appraisalDate: string;
  stage: AppraisalStage;
  agentId?: string;
}

export const AppraisalTasksTab = ({ 
  appraisalId, 
  appraisalDate, 
  stage, 
  agentId 
}: AppraisalTasksTabProps) => {
  const navigate = useNavigate();
  const { tasks, stats, isLoading, toggleComplete, addTask, updateAssignee, updateDueDate } = useAppraisalTasks(appraisalId);
  const { templates } = useAppraisalTemplates();
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSection, setNewTaskSection] = useState(stage);
  const [showAddTask, setShowAddTask] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask.mutate({ 
      title: newTaskTitle, 
      section: newTaskSection, 
      appraisal_stage: stage,
      assigned_to: agentId || undefined
    });
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const hasTemplatesForStage = templates.some(t => t.stage === stage);

  // Transform tasks for UnifiedTaskList
  const unifiedTasks: UnifiedTask[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    due_date: t.due_date,
    section: t.section,
    priority: t.priority,
    assignee: t.assignee,
  }));

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  // Empty state - no tasks
  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center space-y-4">
        <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <div>
          <h3 className="font-medium mb-1">No Tasks Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasTemplatesForStage 
              ? `Apply a ${stage} template to get started with tasks.`
              : 'Create your first task or set up templates.'}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          {hasTemplatesForStage && (
            <Button onClick={() => setShowTemplatePrompt(true)}>
              <ListTodo className="h-4 w-4 mr-2" />
              Apply Template
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate('/appraisal-templates')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Manage Templates
          </Button>
        </div>

        <AppraisalTemplatePromptDialog
          isOpen={showTemplatePrompt}
          onClose={() => setShowTemplatePrompt(false)}
          onComplete={() => setShowTemplatePrompt(false)}
          appraisalId={appraisalId}
          appraisalDate={appraisalDate}
          targetStage={stage}
          agentId={agentId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Badge variant="secondary">
          {stats.completed} / {stats.total} complete
        </Badge>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/appraisal-templates')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Templates
          </Button>
          {hasTemplatesForStage && (
            <Button 
              size="sm"
              onClick={() => setShowTemplatePrompt(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Apply Template
            </Button>
          )}
        </div>
      </div>

      {/* Unified Task List */}
      <UnifiedTaskList
        tasks={unifiedTasks}
        onToggle={(taskId, completed) => toggleComplete.mutate({ taskId, completed })}
        onDateChange={(taskId, date) => updateDueDate.mutate({ taskId, dueDate: date })}
        renderAssignee={(task) => (
          <AppraisalTaskAssignee
            assignee={task.assignee}
            onAssign={(userId) => updateAssignee.mutate({ taskId: task.id, assignedTo: userId })}
            disabled={task.completed}
          />
        )}
        hideCompleted={hideCompleted}
        onHideCompletedChange={setHideCompleted}
        showViewToggle={true}
        storageKey="appraisal-task-view"
        emptyMessage="No tasks yet"
      />

      {/* Add Task */}
      {showAddTask ? (
        <div className="flex gap-2 items-center border rounded-lg p-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') setShowAddTask(false);
            }}
          />
          <Select value={newTaskSection} onValueChange={(v) => setNewTaskSection(v as AppraisalStage)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[12000]">
              <SelectItem value="VAP">VAP</SelectItem>
              <SelectItem value="MAP">MAP</SelectItem>
              <SelectItem value="LAP">LAP</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddTask}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAddTask(false)}>Cancel</Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddTask(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      )}

      <AppraisalTemplatePromptDialog
        isOpen={showTemplatePrompt}
        onClose={() => setShowTemplatePrompt(false)}
        onComplete={() => setShowTemplatePrompt(false)}
        appraisalId={appraisalId}
        appraisalDate={appraisalDate}
        targetStage={stage}
        agentId={agentId}
      />
    </div>
  );
};
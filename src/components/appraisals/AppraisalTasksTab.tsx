import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  ListTodo,
  FileText,
  CalendarIcon
} from 'lucide-react';
import { useAppraisalTasks } from '@/hooks/useAppraisalTasks';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGE_DISPLAY_NAMES } from '@/hooks/useAppraisalTemplates';
import { AppraisalTemplatePromptDialog } from './AppraisalTemplatePromptDialog';
import { isAppraisalRolloverSection } from '@/hooks/useAppraisalTaskRollover';
import { AppraisalTaskAssignee } from './AppraisalTaskAssignee';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  const { tasks, tasksBySection, stats, isLoading, toggleComplete, addTask, updateAssignee, updateDueDate } = useAppraisalTasks(appraisalId);
  const { templates, getDefaultTemplate } = useAppraisalTemplates();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(Object.keys(tasksBySection)));
  const [showTemplatePrompt, setShowTemplatePrompt] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToSection, setAddingToSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleAddTask = (section: string) => {
    if (!newTaskTitle.trim()) return;
    addTask.mutate({ 
      title: newTaskTitle, 
      section, 
      appraisal_stage: stage,
      assigned_to: agentId || undefined
    });
    setNewTaskTitle('');
    setAddingToSection(null);
  };

  const hasTemplatesForStage = templates.some(t => t.stage === stage);

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

  const sections = Object.keys(tasksBySection);
  const isSingleSection = sections.length === 1;

  // Task rendering component
  const TaskItem = ({ task, section }: { task: any; section: string }) => (
    <div
      key={task.id}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md transition-colors",
        task.completed ? "bg-muted/30" : "hover:bg-muted/50"
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) => {
          toggleComplete.mutate({ 
            taskId: task.id, 
            completed: checked as boolean 
          });
        }}
      />
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </span>
        {/* Clickable due date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "text-xs ml-2 hover:underline",
                task.due_date ? "text-muted-foreground hover:text-foreground" : "text-primary"
              )}
            >
              {task.due_date ? (
                <>Due {format(new Date(task.due_date), 'MMM d')}</>
              ) : (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Set date
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={task.due_date ? new Date(task.due_date) : undefined}
              onSelect={(date) => updateDueDate.mutate({ taskId: task.id, dueDate: date || null })}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      <AppraisalTaskAssignee
        assignee={task.assignee}
        onAssign={(userId) => updateAssignee.mutate({ taskId: task.id, assignedTo: userId })}
        disabled={task.completed}
      />
    </div>
  );

  // Add task inline component
  const AddTaskInline = ({ section }: { section: string }) => (
    addingToSection === section ? (
      <div className="flex gap-2 mt-2">
        <Input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Task title..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask(section);
            if (e.key === 'Escape') setAddingToSection(null);
          }}
        />
        <Button size="sm" onClick={() => handleAddTask(section)}>
          Add
        </Button>
      </div>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setAddingToSection(section)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add task
      </Button>
    )
  );

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="secondary">
            {stats.completed} / {stats.total} complete
          </Badge>
          {stats.incomplete > 0 && (
            <span className="text-muted-foreground">
              {stats.incomplete} remaining
            </span>
          )}
        </div>
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

      {/* Single section: render tasks directly without collapsible */}
      {isSingleSection ? (
        <div className="border rounded-lg p-3 space-y-2">
          {tasksBySection[sections[0]].map((task) => (
            <TaskItem key={task.id} task={task} section={sections[0]} />
          ))}
          <AddTaskInline section={sections[0]} />
        </div>
      ) : (
        /* Multiple sections: render with collapsibles */
        sections.map((section) => {
          const sectionTasks = tasksBySection[section];
          const isRollover = isAppraisalRolloverSection(section);
          const completedInSection = sectionTasks.filter(t => t.completed).length;

          return (
            <Collapsible
              key={section}
              open={expandedSections.has(section)}
              onOpenChange={() => toggleSection(section)}
            >
              <div className={cn(
                "border rounded-lg",
                isRollover && "border-amber-500/30 bg-amber-500/5"
              )}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {expandedSections.has(section) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium text-sm">{section}</span>
                      {isRollover && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          From previous stage
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {completedInSection}/{sectionTasks.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2">
                    {sectionTasks.map((task) => (
                      <TaskItem key={task.id} task={task} section={section} />
                    ))}
                    <AddTaskInline section={section} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })
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
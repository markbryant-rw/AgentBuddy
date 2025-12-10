import { useState } from 'react';
import { useTriageQueue, TriageTask } from '@/hooks/useTriageQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Inbox, 
  ChevronDown, 
  Target, 
  Star, 
  Zap,
  Building2,
  FolderKanban,
  RefreshCw,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriageQueueSectionProps {
  date: Date;
}

export function TriageQueueSection({ date }: TriageQueueSectionProps) {
  const { triageTasks, isLoading, triageTask, isTriaging } = useTriageQueue(date);
  const [isOpen, setIsOpen] = useState(true);

  if (isLoading) {
    return null;
  }

  if (triageTasks.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CollapsibleTrigger asChild>
          <button className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <Inbox className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                TRIAGE QUEUE
              </h2>
              <Badge 
                variant="secondary" 
                className="bg-amber-500/20 text-amber-700 dark:text-amber-300"
              >
                {triageTasks.length} {triageTasks.length === 1 ? 'task' : 'tasks'} need sorting
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-amber-600 dark:text-amber-400 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              These tasks are due today. Sort them into your day by priority.
            </p>
            
            {triageTasks.map((task) => (
              <TriageTaskCard 
                key={task.id} 
                task={task} 
                onTriage={(category) => triageTask({ task, sizeCategory: category })}
                isTriaging={isTriaging}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface TriageTaskCardProps {
  task: TriageTask;
  onTriage: (category: 'big' | 'medium' | 'little') => void;
  isTriaging: boolean;
}

function TriageTaskCard({ task, onTriage, isTriaging }: TriageTaskCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Source Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {task.source === 'transaction' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">TC</span>
            </div>
          )}
          {task.source === 'appraisal' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Home className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Appraisal</span>
            </div>
          )}
          {task.source === 'project' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FolderKanban className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Project</span>
            </div>
          )}
          {/* Weekly Recurring Badge */}
          {task.is_weekly_recurring && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <RefreshCw className="h-3 w-3" />
              <span className="text-xs font-medium">Weekly</span>
            </div>
          )}
        </div>
        
        {/* Task Info */}
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{task.title}</p>
          {task.transaction && (
            <p className="text-xs text-muted-foreground truncate">
              {task.transaction.address}
            </p>
          )}
          {task.appraisal && (
            <p className="text-xs text-muted-foreground truncate">
              {task.appraisal.address}
            </p>
          )}
          {task.project && (
            <p className="text-xs text-muted-foreground truncate">
              {task.project.icon} {task.project.title}
            </p>
          )}
        </div>
      </div>

      {/* Quick Sort Buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTriage('big')}
          disabled={isTriaging}
          className="h-8 px-2.5 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          title="High-Impact Task"
        >
          <Target className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Big</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTriage('medium')}
          disabled={isTriaging}
          className="h-8 px-2.5 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
          title="Important Work"
        >
          <Star className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Med</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTriage('little')}
          disabled={isTriaging}
          className="h-8 px-2.5 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          title="Quick Win"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Quick</span>
        </Button>
      </div>
    </div>
  );
}

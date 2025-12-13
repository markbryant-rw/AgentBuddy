import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  AlertCircle, 
  Calendar as CalendarIcon, 
  Clock, 
  CalendarDays,
  ChevronDown,
  ChevronRight,
  LayoutList,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isThisWeek, startOfDay } from 'date-fns';

export interface UnifiedTask {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string | null;
  section?: string;
  priority?: string;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

interface UnifiedTaskListProps {
  tasks: UnifiedTask[];
  onToggle: (taskId: string, completed: boolean) => void;
  onDateChange?: (taskId: string, date: Date | null) => void;
  onAssign?: (taskId: string, userId: string | null) => void;
  renderAssignee?: (task: UnifiedTask) => React.ReactNode;
  hideCompleted?: boolean;
  onHideCompletedChange?: (hide: boolean) => void;
  showViewToggle?: boolean;
  defaultView?: 'date' | 'section';
  storageKey?: string;
  emptyMessage?: string;
  className?: string;
}

type DateGroup = 'overdue' | 'today' | 'thisWeek' | 'later' | 'noDueDate';

const DATE_GROUP_CONFIG: Record<DateGroup, { 
  label: string; 
  icon: typeof AlertCircle; 
  className: string;
  headerClassName: string;
}> = {
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    className: 'text-destructive',
    headerClassName: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  today: {
    label: 'Today',
    icon: CalendarIcon,
    className: 'text-orange-600 dark:text-orange-400',
    headerClassName: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  thisWeek: {
    label: 'This Week',
    icon: Clock,
    className: 'text-amber-600 dark:text-amber-400',
    headerClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  later: {
    label: 'Later',
    icon: CalendarDays,
    className: 'text-muted-foreground',
    headerClassName: 'bg-muted/50 text-muted-foreground border-muted',
  },
  noDueDate: {
    label: 'No Due Date',
    icon: Clock,
    className: 'text-muted-foreground',
    headerClassName: 'bg-muted/30 text-muted-foreground border-muted/50',
  },
};

function getDateGroup(dueDate: string | null | undefined, completed: boolean): DateGroup {
  if (!dueDate) return 'noDueDate';
  
  const date = startOfDay(new Date(dueDate));
  const now = startOfDay(new Date());
  
  if (!completed && isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'thisWeek';
  return 'later';
}

export const UnifiedTaskList = ({
  tasks,
  onToggle,
  onDateChange,
  renderAssignee,
  hideCompleted = false,
  onHideCompletedChange,
  showViewToggle = true,
  defaultView = 'date',
  storageKey = 'task-view-preference',
  emptyMessage = 'No tasks',
  className,
}: UnifiedTaskListProps) => {
  const [view, setView] = useState<'date' | 'section'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'date' || saved === 'section') return saved;
    }
    return defaultView;
  });
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['overdue', 'today', 'thisWeek'])
  );

  const handleViewChange = (newView: 'date' | 'section') => {
    setView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newView);
    }
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Filter and group tasks
  const { groupedTasks, filteredTasks } = useMemo(() => {
    let filtered = tasks;
    if (hideCompleted) {
      filtered = tasks.filter(t => !t.completed);
    }

    if (view === 'date') {
      // Group by date
      const groups: Record<DateGroup, UnifiedTask[]> = {
        overdue: [],
        today: [],
        thisWeek: [],
        later: [],
        noDueDate: [],
      };
      
      filtered.forEach(task => {
        const group = getDateGroup(task.due_date, task.completed);
        groups[group].push(task);
      });

      // Sort within each group by date
      Object.values(groups).forEach(groupTasks => {
        groupTasks.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      });

      return { groupedTasks: groups, filteredTasks: filtered };
    } else {
      // Group by section
      const groups: Record<string, UnifiedTask[]> = {};
      filtered.forEach(task => {
        const section = task.section || 'Uncategorized';
        if (!groups[section]) groups[section] = [];
        groups[section].push(task);
      });

      // Sort within each section by date
      Object.values(groups).forEach(groupTasks => {
        groupTasks.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      });

      return { groupedTasks: groups, filteredTasks: filtered };
    }
  }, [tasks, hideCompleted, view]);

  const completedCount = tasks.filter(t => t.completed).length;

  if (filteredTasks.length === 0 && !hideCompleted) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  const renderTaskRow = (task: UnifiedTask) => {
    const isOverdue = task.due_date && !task.completed && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
    
    return (
      <div
        key={task.id}
        className={cn(
          "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
          task.completed ? "bg-muted/30 opacity-60" : "hover:bg-muted/50",
          isOverdue && !task.completed && "bg-destructive/5"
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => onToggle(task.id, checked as boolean)}
        />
        
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={cn(
            "text-sm truncate",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </span>
          
          {/* Section badge (shown in date view) */}
          {view === 'date' && task.section && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {task.section}
            </Badge>
          )}
        </div>

        {/* Due date (clickable if onDateChange provided) */}
        {onDateChange ? (
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className={cn(
                  "text-xs shrink-0 hover:underline",
                  isOverdue ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {task.due_date ? (
                  format(new Date(task.due_date), 'MMM d')
                ) : (
                  <span className="flex items-center gap-1 text-primary">
                    <CalendarIcon className="h-3 w-3" />
                    Set
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[12000]" align="end">
              <Calendar
                mode="single"
                selected={task.due_date ? new Date(task.due_date) : undefined}
                onSelect={(date) => onDateChange(task.id, date || null)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        ) : task.due_date ? (
          <span className={cn(
            "text-xs shrink-0",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        ) : null}

        {/* Assignee */}
        {renderAssignee && renderAssignee(task)}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with toggle */}
      {(showViewToggle || onHideCompletedChange) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{tasks.length} done
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onHideCompletedChange && completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onHideCompletedChange(!hideCompleted)}
              >
                {hideCompleted ? 'Show completed' : 'Hide completed'}
              </Button>
            )}
            
            {showViewToggle && (
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  variant={view === 'date' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs rounded-none gap-1"
                  onClick={() => handleViewChange('date')}
                >
                  <CalendarIcon className="h-3 w-3" />
                  By Date
                </Button>
                <Button
                  variant={view === 'section' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs rounded-none gap-1"
                  onClick={() => handleViewChange('section')}
                >
                  <FolderOpen className="h-3 w-3" />
                  By Section
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task groups */}
      {view === 'date' ? (
        // Date-based grouping with lightweight headers
        <div className="space-y-1">
          {(Object.keys(DATE_GROUP_CONFIG) as DateGroup[]).map(groupKey => {
            const groupTasks = (groupedTasks as Record<DateGroup, UnifiedTask[]>)[groupKey];
            if (!groupTasks || groupTasks.length === 0) return null;
            
            const config = DATE_GROUP_CONFIG[groupKey];
            const Icon = config.icon;
            const isOpen = expandedGroups.has(groupKey);

            return (
              <Collapsible
                key={groupKey}
                open={isOpen}
                onOpenChange={() => toggleGroup(groupKey)}
              >
                <div className={cn("rounded-lg border", config.headerClassName)}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-3 py-2 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{config.label}</span>
                        <Badge variant="secondary" className="text-xs h-5">
                          {groupTasks.length}
                        </Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-1">
                      {groupTasks.map(renderTaskRow)}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        // Section-based grouping
        <div className="space-y-1">
          {Object.entries(groupedTasks as Record<string, UnifiedTask[]>).map(([section, sectionTasks]) => {
            if (!sectionTasks || sectionTasks.length === 0) return null;
            const isOpen = expandedGroups.has(section);

            return (
              <Collapsible
                key={section}
                open={isOpen}
                onOpenChange={() => toggleGroup(section)}
              >
                <div className="rounded-lg border">
                  <CollapsibleTrigger asChild>
                    <button className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{section}</span>
                        <Badge variant="secondary" className="text-xs h-5">
                          {sectionTasks.length}
                        </Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-1">
                      {sectionTasks.map(renderTaskRow)}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {filteredTasks.length === 0 && hideCompleted && completedCount > 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          All tasks completed! 🎉
        </div>
      )}
    </div>
  );
};

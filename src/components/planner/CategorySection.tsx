import { PlannerItem } from './PlannerItem';
import { DailyPlannerItem, useDailyPlanner } from '@/hooks/useDailyPlanner';
import { EmptySlotCard } from './EmptySlotCard';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface CategorySectionProps {
  category: 'big' | 'medium' | 'little';
  items: DailyPlannerItem[];
  maxItems?: number;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignmentClick: (item: DailyPlannerItem) => void;
  onAddTask: (title: string, category: 'big' | 'medium' | 'little') => void;
}

const categoryConfig = {
  big: {
    title: 'High-Impact',
    shortTitle: 'High-Impact',
    description: 'Your most important work today',
    helpText: 'Tasks with the biggest impact on your goals. Examples: Client presentations, strategic decisions, major deals.',
    icon: '🎯',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    progressColor: 'bg-red-500',
    max: 3,
  },
  medium: {
    title: 'Important Work',
    shortTitle: 'Important',
    description: 'Tasks that move projects forward',
    helpText: 'Important but not urgent tasks. Examples: Follow-up calls, proposal writing, meeting prep.',
    icon: '⭐',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    progressColor: 'bg-amber-500',
    max: 6,
  },
  little: {
    title: 'Quick Wins',
    shortTitle: 'Quick Wins',
    description: 'Under 15 minutes each',
    helpText: 'Tasks you can complete in 5-15 minutes. Examples: Respond to emails, schedule appointments.',
    icon: '⚡',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    progressColor: 'bg-green-500',
    max: undefined,
  },
};

export function CategorySection({
  category,
  items,
  onToggleComplete,
  onDelete,
  onAssignmentClick,
  onAddTask,
}: CategorySectionProps) {
  const config = categoryConfig[category];
  
  // Sort: uncompleted first (by order_within_category), then completed (by completed_at)
  const sortedItems = useMemo(() => {
    const uncompleted = items
      .filter(item => !item.completed)
      .sort((a, b) => a.order_within_category - b.order_within_category);
    
    const completed = items
      .filter(item => item.completed)
      .sort((a, b) => {
        const aTime = a.completed_at || '';
        const bTime = b.completed_at || '';
        return aTime > bTime ? -1 : 1;
      });
    
    return { uncompleted, completed };
  }, [items]);

  const totalTasks = sortedItems.uncompleted.length + sortedItems.completed.length;
  const completedCount = sortedItems.completed.length;
  const isAtLimit = config.max && totalTasks >= config.max;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const { updateItem } = useDailyPlanner();

  // Calculate empty slots: total allowed minus all tasks (completed + uncompleted)
  const emptySlots = config.max 
    ? Math.max(0, config.max - totalTasks)
    : 0;
  
  // Limit completed tasks to fit within the max
  const maxCompletedToShow = config.max 
    ? Math.max(0, config.max - sortedItems.uncompleted.length)
    : sortedItems.completed.length;

  const handleAddClick = (slotIndex: number) => {
    setEditingSlot(slotIndex);
    setInputValue('');
  };

  const handleAddTask = () => {
    if (inputValue.trim()) {
      onAddTask(inputValue.trim(), category);
      setInputValue('');
      setEditingSlot(null);
    }
  };

  const handleUpdateTime = (id: string, minutes: number) => {
    updateItem({ id, updates: { estimated_minutes: minutes } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setEditingSlot(null);
      setInputValue('');
    }
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category}`,
    data: { category }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "space-y-2 transition-all rounded-lg p-3 -m-3",
        isOver && "bg-primary/5 ring-2 ring-primary/20 shadow-lg"
      )}
    >
      {/* Compact Header with Integrated Progress */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-base", config.color)}>{config.icon}</span>
          <span className="text-sm font-medium truncate">{config.shortTitle}</span>
          
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-sm" sideOffset={8}>
                <p className="font-medium mb-1">{config.title}</p>
                <p className="text-muted-foreground">{config.helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Progress Section */}
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          {config.max ? (
            <>
              <Progress 
                value={progressPercent} 
                className="h-1.5 flex-1 bg-muted/50"
                indicatorClassName={config.progressColor}
              />
              <span className={cn(
                "text-xs font-medium tabular-nums shrink-0",
                completedCount === totalTasks && totalTasks > 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                {completedCount}/{config.max}
              </span>
            </>
          ) : totalTasks > 0 ? (
            <>
              <Progress 
                value={progressPercent} 
                className="h-1.5 flex-1 bg-muted/50"
                indicatorClassName={config.progressColor}
              />
              <span className={cn(
                "text-xs font-medium tabular-nums shrink-0",
                completedCount === totalTasks ? "text-green-600" : "text-muted-foreground"
              )}>
                {completedCount}/{totalTasks}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No tasks</span>
          )}
        </div>
      </div>

      {/* Tasks Grid */}
      <SortableContext
        items={sortedItems.uncompleted.map(i => i.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 gap-3">
          {/* First: All uncompleted tasks sorted by order */}
          {sortedItems.uncompleted.map((item) => (
            <PlannerItem
              key={item.id}
              item={item}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onAssignmentClick={onAssignmentClick}
              onUpdateTime={handleUpdateTime}
              onUpdateTitle={(id, title) => updateItem({ id, updates: { title } })}
              onUpdateNotes={(id, notes) => updateItem({ id, updates: { notes } })}
            />
          ))}
          
          {/* Then: Completed tasks (limited to fit within max) */}
          {sortedItems.completed
            .sort((a, b) => {
              const aTime = a.completed_at || '';
              const bTime = b.completed_at || '';
              return aTime > bTime ? 1 : -1;
            })
            .slice(0, maxCompletedToShow)
            .map((item) => (
              <PlannerItem
                key={item.id}
                item={item}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onAssignmentClick={onAssignmentClick}
                onUpdateTime={handleUpdateTime}
                onUpdateTitle={(id, title) => updateItem({ id, updates: { title } })}
                onUpdateNotes={(id, notes) => updateItem({ id, updates: { notes } })}
              />
            ))}
          
          {/* Empty Slots for Big 3 and Medium 6 */}
          {config.max && Array.from({ length: emptySlots }).map((_, idx) => {
            const slotIndex = sortedItems.uncompleted.length + idx;
            return editingSlot === slotIndex ? (
              <div key={`input-${idx}`} className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed bg-card/50 min-h-[120px]" style={{ borderColor: `hsl(var(--${category === 'big' ? 'primary' : category === 'medium' ? 'chart-2' : 'chart-3'}) / 0.3)` }}>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Add task...`}
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  onClick={handleAddTask}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <EmptySlotCard 
                key={`empty-${idx}`} 
                category={category}
                onAddClick={() => handleAddClick(slotIndex)}
              />
            );
          })}
          
          {/* Quick Wins - always show add slot */}
          {!config.max && (
            editingSlot === sortedItems.uncompleted.length ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-green-500/30 bg-card/50 min-h-[120px]">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Quick task..."
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  onClick={handleAddTask}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <EmptySlotCard 
                category={category}
                onAddClick={() => handleAddClick(sortedItems.uncompleted.length)}
              />
            )
          )}
        </div>
      </SortableContext>
    </div>
  );
}
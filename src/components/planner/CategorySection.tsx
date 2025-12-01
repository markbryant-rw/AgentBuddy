import { PlannerItem } from './PlannerItem';
import { DailyPlannerItem, useDailyPlanner } from '@/hooks/useDailyPlanner';
import { EmptySlotCard } from './EmptySlotCard';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    title: '🎯 High-Impact Tasks (3)',
    description: 'Your most important work today',
    helpText: 'Tasks with the biggest impact on your goals. Examples: Client presentations, strategic decisions, major deals, critical problem-solving, revenue-generating activities.',
    icon: '🎯',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    max: 3,
  },
  medium: {
    title: '⭐ Important Work (6)',
    description: 'Tasks that move projects forward',
    helpText: 'Important but not urgent tasks that keep projects on track. Examples: Follow-up calls, proposal writing, meeting prep, property research, contract reviews, team check-ins.',
    icon: '⭐',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    max: 6,
  },
  little: {
    title: '⚡ Quick Wins (Under 15min)',
    description: 'Small tasks you can knock out quickly',
    helpText: 'Tasks you can complete in 5-15 minutes. Examples: Respond to emails, schedule appointments, update CRM, send documents, make quick phone calls, social media posts.',
    icon: '⚡',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
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
  const isAtLimit = config.max && totalTasks >= config.max;
  
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
        "space-y-2 transition-all rounded-lg p-4 -m-4",
        isOver && "bg-primary/5 ring-2 ring-primary/20 shadow-lg"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            <span>{config.title}</span>
            
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="max-w-xs text-sm"
                  sideOffset={8}
                >
                  <p className="font-medium mb-1">{config.title}</p>
                  <p className="text-muted-foreground">{config.helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {config.max && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                isAtLimit ? "bg-destructive/20 text-destructive" : config.bgColor
              )}>
                {sortedItems.uncompleted.length}/{config.max}
              </span>
            )}
            {!config.max && sortedItems.uncompleted.length > 0 && (
              <span className={cn("text-xs px-2 py-0.5 rounded-full", config.bgColor)}>
                {sortedItems.uncompleted.length}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground max-w-2xl">
            {config.description}
          </p>
        </div>
      </div>

      {/* Live Tasks First, Completed at Back */}
      <SortableContext
        items={sortedItems.uncompleted.map(i => i.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 gap-4">
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
              <div key={`input-${idx}`} className="flex items-center gap-2 p-4 rounded-lg border-2 border-dashed bg-card/50 w-[240px] h-[140px]" style={{ borderColor: `hsl(var(--${category === 'big' ? 'primary' : category === 'medium' ? 'chart-2' : 'chart-3'}) / 0.3)` }}>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Add ${config.title.toLowerCase()}...`}
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
              <div className="flex items-center gap-2 p-4 rounded-lg border-2 border-dashed border-green-500/30 bg-card/50 w-[240px] h-[140px]">
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

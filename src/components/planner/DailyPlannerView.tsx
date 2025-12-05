import { useState } from 'react';
import { addDays, subDays, format, isToday } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useDailyPlanner, DailyPlannerItem } from '@/hooks/useDailyPlanner';
import { useTeam } from '@/hooks/useTeam';
import { RollForwardDialog } from './RollForwardDialog';
import { RollForwardBanner } from './RollForwardBanner';
import { CategorySection } from './CategorySection';
import { PlannerItem } from './PlannerItem';
import { ViewToggle } from './ViewToggle';
import { ThreeDayView } from './ThreeDayView';
import { WeeklyAnalytics } from './WeeklyAnalytics';
import { TriageQueueSection } from './TriageQueueSection';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type ViewType = 'day' | '3-day' | 'analytics';

export function DailyPlannerView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('day');
  const [rollForwardDialogOpen, setRollForwardDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { team } = useTeam();

  const {
    items,
    isLoading,
    createItem,
    deleteItem,
    toggleComplete,
    reorderItem,
    updateAssignments,
    updateItem,
    rollForward,
  } = useDailyPlanner(selectedDate);

  // Calculate uncompleted count from items
  const uncompletedCount = items.filter(item => !item.completed).length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (typeof active.id !== 'string' || typeof over.id !== 'string') {
      console.error('Expected string IDs for drag event');
      setActiveId(null);
      return;
    }

    const activeItem = items.find(i => i.id === active.id);
    if (!activeItem) return;

    // Check if dropped over a category zone
    const overId = over.id;
    if (overId.startsWith('category-')) {
      const targetCategory = overId.replace('category-', '') as 'big' | 'medium' | 'little';
      
      // Check if moving to different category
      if (activeItem.size_category !== targetCategory) {
        // Check limits
        const targetCategoryItems = items.filter(i => 
          i.size_category === targetCategory && !i.completed
        );
        
        const limits = { big: 3, medium: 6, little: undefined };
        const maxItems = limits[targetCategory];
        
        if (maxItems && targetCategoryItems.length >= maxItems) {
          const categoryNames = { big: 'High-Impact Tasks', medium: 'Important Work', little: 'Quick Wins' };
          toast.error(`Cannot move - ${categoryNames[targetCategory]} is full`);
          return;
        }
        
        // Update item's category
        updateItem({ 
          id: activeItem.id,
          updates: {
            size_category: targetCategory,
            position: targetCategoryItems.length
          }
        });
        
        const categoryNames = { big: 'High-Impact Tasks', medium: 'Important Work', little: 'Quick Wins' };
        toast.success(`Task moved to ${categoryNames[targetCategory]}`);
        return;
      }
    }

    // Original within-category reordering logic
    if (active.id !== over.id) {
      const overItem = items.find(i => i.id === over.id);
      if (overItem && activeItem.size_category === overItem.size_category) {
        const categoryItems = items.filter(i => i.size_category === activeItem.size_category);
        const oldIndex = categoryItems.findIndex(i => i.id === active.id);
        const newIndex = categoryItems.findIndex(i => i.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderItem({ itemId: active.id, newPosition: newIndex });
        }
      }
    }
    
    setActiveId(null);
  };

  const handleSaveAssignments = (itemId: string, userIds: string[]) => {
    updateAssignments({ itemId, userIds });
  };

  const handleRollForward = () => {
    if (!team?.id) return;
    const nextDay = addDays(selectedDate, 1);
    rollForward({
      targetDate: nextDay,
      currentDateStr: format(selectedDate, 'yyyy-MM-dd'),
      teamId: team.id,
    });
    setRollForwardDialogOpen(false);
    setSelectedDate(nextDay);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const bigItems = items.filter(i => i.size_category === 'big');
  const mediumItems = items.filter(i => i.size_category === 'medium');
  const littleItems = items.filter(i => i.size_category === 'little');

  // Calculate overall progress
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Compact Header with Date Navigation, Progress, and Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[140px]">
            <h2 className="text-lg font-semibold leading-tight">
              {format(selectedDate, 'EEEE')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, 'MMM d, yyyy')}
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday(selectedDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          )}

          {/* Compact Progress Badge */}
          {view === 'day' && totalCount > 0 && (
            <Badge 
              variant={progressPercent === 100 ? "default" : "secondary"} 
              className="ml-2 gap-1.5 font-medium"
            >
              <span>{completedCount}/{totalCount}</span>
              <span className="text-muted-foreground">•</span>
              <span>{progressPercent}%</span>
            </Badge>
          )}

          {/* Roll Forward - Inline */}
          {view === 'day' && uncompletedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setRollForwardDialogOpen(true)}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Roll {uncompletedCount} forward
            </Button>
          )}
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Content based on view */}
      {view === '3-day' && (
        <ThreeDayView startDate={selectedDate} onDateClick={handleDateClick} />
      )}

      {view === 'analytics' && (
        <WeeklyAnalytics weekStart={selectedDate} />
      )}

      {view === 'day' && (
        <>
          {/* Triage Queue - Tasks due today that need sorting */}
          <TriageQueueSection date={selectedDate} />

          {/* Roll Forward Banner - Keep this for important notifications */}
          {team?.id && <RollForwardBanner teamId={team.id} currentDate={selectedDate} />}

          {/* Category Sections - Now immediately visible */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                <CategorySection
                  category="big"
                  items={bigItems}
                  onToggleComplete={toggleComplete}
                  onDelete={deleteItem}
                  onSaveAssignments={handleSaveAssignments}
                  onAddTask={(title, category) => createItem({ title, sizeCategory: category })}
                />

                <CategorySection
                  category="medium"
                  items={mediumItems}
                  onToggleComplete={toggleComplete}
                  onDelete={deleteItem}
                  onSaveAssignments={handleSaveAssignments}
                  onAddTask={(title, category) => createItem({ title, sizeCategory: category })}
                />

                <CategorySection
                  category="little"
                  items={littleItems}
                  onToggleComplete={toggleComplete}
                  onDelete={deleteItem}
                  onSaveAssignments={handleSaveAssignments}
                  onAddTask={(title, category) => createItem({ title, sizeCategory: category })}
                />

                {items.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">No tasks planned for this day</p>
                    <p className="text-sm">Add your first task above to get started</p>
                  </div>
                )}
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="opacity-80 rotate-3 scale-105">
                    <PlannerItem
                      item={items.find(i => i.id === activeId)!}
                      onToggleComplete={() => {}}
                      onDelete={() => {}}
                      onSaveAssignments={() => {}}
                      onUpdateTime={() => {}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {/* Dialogs */}
      <RollForwardDialog
        open={rollForwardDialogOpen}
        onOpenChange={setRollForwardDialogOpen}
        uncompletedCount={uncompletedCount}
        currentDate={selectedDate}
        onConfirm={handleRollForward}
      />
    </div>
  );
}

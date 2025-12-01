import { useState } from 'react';
import { format } from 'date-fns';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DailyCapacityIndicator } from './DailyCapacityIndicator';
import { DailyTaskSection } from './DailyTaskSection';
import { useDailyTasks } from '@/hooks/useDailyTasks';
import { AddDailyTaskInput } from './AddDailyTaskInput';
import { DailyTaskItem } from './DailyTaskItem';
import { QuickAddTaskDialog } from './QuickAddTaskDialog';

export function DailyTaskView() {
  const today = new Date();
  const { tasks, isLoading, updateTaskPosition, optimizeDay } = useDailyTasks();
  const [quickAddDialog, setQuickAddDialog] = useState<{
    open: boolean;
    sizeCategory: 'big' | 'medium' | 'little';
    position: number;
  }>({ open: false, sizeCategory: 'big', position: 0 });

  const handleAddToSlot = (position: number, sizeCategory: 'big' | 'medium' | 'little') => {
    setQuickAddDialog({ open: true, sizeCategory, position });
  };

  // @ts-ignore - New fields not yet in generated types
  const bigTasks = tasks.filter(t => t.size_category === 'big' && !t.completed);
  // @ts-ignore - New fields not yet in generated types
  const mediumTasks = tasks.filter(t => t.size_category === 'medium' && !t.completed);
  // @ts-ignore - New fields not yet in generated types
  const littleTasks = tasks.filter(t => t.size_category === 'little' && !t.completed);

  const totalPlannedMinutes = tasks
    .filter(t => !t.completed)
    // @ts-ignore - New fields not yet in generated types
    .reduce((sum, task) => sum + (task.estimated_duration_minutes || 0), 0);

  const completedMinutes = tasks
    .filter(t => t.completed)
    // @ts-ignore - New fields not yet in generated types
    .reduce((sum, task) => sum + (task.estimated_duration_minutes || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Today's Focus</h1>
          <p className="text-muted-foreground">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={optimizeDay}
        >
          <Sparkles className="h-4 w-4" />
          Optimize My Day
        </Button>
      </div>

      {/* Capacity Indicator */}
      <DailyCapacityIndicator
        totalPlannedMinutes={totalPlannedMinutes}
        completedMinutes={completedMinutes}
      />

      {/* Task Sections */}
      <Card className="p-6 space-y-8">
        {/* @ts-ignore - New fields not yet in generated types */}
        <DailyTaskSection
          title="🔥 BIG THINGS"
          subtitle="3 max"
          tasks={bigTasks}
          maxTasks={3}
          sizeCategory="big"
          onReorder={updateTaskPosition}
          onAddToSlot={handleAddToSlot}
          gridCols="grid-cols-1 sm:grid-cols-3"
        />

        {/* @ts-ignore - New fields not yet in generated types */}
        <DailyTaskSection
          title="📋 MEDIUM THINGS"
          subtitle="6 max"
          tasks={mediumTasks}
          maxTasks={6}
          sizeCategory="medium"
          onReorder={updateTaskPosition}
          onAddToSlot={handleAddToSlot}
          gridCols="grid-cols-2 sm:grid-cols-3"
        />

        {/* Quick Wins Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">✨ QUICK WINS</h2>
            <span className="text-sm text-muted-foreground">unlimited</span>
          </div>
          
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3 bg-accent/5">
            {littleTasks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {littleTasks.map((task) => (
                  <DailyTaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
            
            <AddDailyTaskInput defaultCategory="little" />
          </div>
        </div>
      </Card>

      <QuickAddTaskDialog
        open={quickAddDialog.open}
        onOpenChange={(open) => setQuickAddDialog({ ...quickAddDialog, open })}
        sizeCategory={quickAddDialog.sizeCategory}
        position={quickAddDialog.position}
      />
    </div>
  );
}

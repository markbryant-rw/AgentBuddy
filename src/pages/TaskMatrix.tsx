import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useTasks } from '@/hooks/useTasks';
import { MatrixQuadrant } from '@/components/tasks/MatrixQuadrant';
import { TaskBoardCard } from '@/components/tasks/TaskBoardCard';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Grid2X2 } from 'lucide-react';

export default function TaskMatrix() {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter out completed tasks and categorize by urgency/importance
  const activeTasks = tasks.filter(t => !t.completed);
  
  const urgentImportant = activeTasks.filter(t => t.is_urgent && t.is_important);
  const notUrgentImportant = activeTasks.filter(t => !t.is_urgent && t.is_important);
  const urgentNotImportant = activeTasks.filter(t => t.is_urgent && !t.is_important);
  const notUrgentNotImportant = activeTasks.filter(t => !t.is_urgent && !t.is_important);

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (typeof active.id !== 'string' || typeof over.id !== 'string') {
      console.error('Expected string IDs for drag event');
      return;
    }

    const taskId = active.id;
    const quadrantId = over.id;

    // Determine new urgency/importance based on quadrant
    let updates: { is_urgent?: boolean; is_important?: boolean } = {};
    
    switch (quadrantId) {
      case 'urgent-important':
        updates = { is_urgent: true, is_important: true };
        break;
      case 'not-urgent-important':
        updates = { is_urgent: false, is_important: true };
        break;
      case 'urgent-not-important':
        updates = { is_urgent: true, is_important: false };
        break;
      case 'not-urgent-not-important':
        updates = { is_urgent: false, is_important: false };
        break;
    }

    if (Object.keys(updates).length > 0) {
      await updateTask({ taskId, updates });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/operate-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operate
            </Button>
            <div className="flex items-center gap-2">
              <Grid2X2 className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Eisenhower Matrix</h1>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {activeTasks.length} active tasks
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="flex-1 p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
            <MatrixQuadrant
              id="urgent-important"
              title="Urgent & Important"
              subtitle="Do First"
              icon="🔥"
              colorClass="bg-destructive/10 border-destructive"
              headerClass="bg-destructive/20 text-destructive"
              tasks={urgentImportant}
              onTaskClick={setSelectedTaskId}
            />
            
            <MatrixQuadrant
              id="not-urgent-important"
              title="Important, Not Urgent"
              subtitle="Schedule"
              icon="⭐"
              colorClass="bg-primary/10 border-primary"
              headerClass="bg-primary/20 text-primary"
              tasks={notUrgentImportant}
              onTaskClick={setSelectedTaskId}
            />
            
            <MatrixQuadrant
              id="urgent-not-important"
              title="Urgent, Not Important"
              subtitle="Delegate"
              icon="⚡"
              colorClass="bg-orange-500/10 border-orange-500"
              headerClass="bg-orange-500/20 text-orange-600"
              tasks={urgentNotImportant}
              onTaskClick={setSelectedTaskId}
            />
            
            <MatrixQuadrant
              id="not-urgent-not-important"
              title="Not Urgent & Not Important"
              subtitle="Delete/Defer"
              icon="💤"
              colorClass="bg-muted border-muted-foreground/20"
              headerClass="bg-muted text-muted-foreground"
              tasks={notUrgentNotImportant}
              onTaskClick={setSelectedTaskId}
            />
          </div>

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={null}>
            {activeId && (
              <div className="rotate-2 scale-105 shadow-2xl opacity-95 cursor-grabbing">
                <TaskBoardCard
                  task={tasks.find((t) => t.id === activeId)}
                  onClick={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}

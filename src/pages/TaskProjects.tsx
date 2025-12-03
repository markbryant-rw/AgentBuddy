import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Kanban, Plus } from 'lucide-react';
import { useTaskBoards } from '@/hooks/useTaskBoards';
import { CreateBoardDialog } from '@/components/tasks/enhanced/CreateBoardDialog';
import { EditBoardDialog } from '@/components/tasks/EditBoardDialog';
import { EnhancedProjectBoardCard } from '@/components/tasks/enhanced/EnhancedProjectBoardCard';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPast, isToday } from 'date-fns';

// Draggable Board Card Wrapper
const DraggableBoardCard = ({ board, taskStats, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: board.id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EnhancedProjectBoardCard
        board={board}
        taskStats={taskStats}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

export default function TaskProjects() {
  const navigate = useNavigate();
  const { boards, isLoading, reorderBoards, deleteBoard } = useTaskBoards();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [boardTaskStats, setBoardTaskStats] = useState<Record<string, any>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // PHASE 1: Removed empty loop - stats are now computed on demand or via edge function

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = boards.findIndex(b => b.id === active.id);
    const newIndex = boards.findIndex(b => b.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = [...boards];
      const [movedBoard] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedBoard);
      
      await reorderBoards(newOrder.map(b => b.id));
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    await deleteBoard(boardId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/operate-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operate
            </Button>
            <div className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Project Boards</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Project Boards</h1>
              <p className="text-muted-foreground">Manage your projects with kanban boards</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Board
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={boards.map(b => b.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <DraggableBoardCard
                    key={board.id}
                    board={board}
                    taskStats={boardTaskStats[board.id]}
                    onEdit={() => setEditingBoard(board)}
                    onDelete={() => handleDeleteBoard(board.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {boards.length === 0 && (
            <div className="text-center py-12">
              <Kanban className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No project boards yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project board to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateBoardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EditBoardDialog
        open={!!editingBoard}
        onOpenChange={(open) => !open && setEditingBoard(null)}
        board={editingBoard}
      />
    </div>
  );
}

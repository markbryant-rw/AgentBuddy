import { useState, useEffect, useMemo } from 'react';
import { useDragScroll } from '@/hooks/useDragScroll';
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
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTaskBoards } from '@/hooks/useTaskBoards';
import { useTaskLists } from '@/hooks/useTaskLists';
import { useTasks } from '@/hooks/useTasks';
import { SortableTaskListColumn } from '@/components/tasks/SortableTaskListColumn';
import { TaskBoardCard } from '@/components/tasks/TaskBoardCard';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { CreateListDialog } from '@/components/tasks/CreateListDialog';
import { EditListDialog } from '@/components/tasks/EditListDialog';
import { CreateBoardDialog } from '@/components/tasks/CreateBoardDialog';
import { EditBoardDialog } from '@/components/tasks/EditBoardDialog';
import { EnhancedBoardHeader } from '@/components/tasks/enhanced/EnhancedBoardHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Pencil, Trash2, Grid2X2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';

interface TaskManagerProps {
  boardId?: string;
}

export default function TaskManager({ boardId }: TaskManagerProps) {
  const navigate = useNavigate();
  const { boards, deleteBoard } = useTaskBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [createBoardDialogOpen, setCreateBoardDialogOpen] = useState(false);
  const [editBoardDialogOpen, setEditBoardDialogOpen] = useState(false);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ members: string[]; tags: string[] }>({ members: [], tags: [] });
  
  const { lists: serverLists, deleteList, reorderLists } = useTaskLists(selectedBoardId);
  const { tasks, updateTask } = useTasks(selectedBoardId);
  
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false);
  const [editListId, setEditListId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'task' | 'list' | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [optimisticLists, setOptimisticLists] = useState<typeof serverLists>([]);
  
  // Auto-select board: use provided boardId or first board
  useEffect(() => {
    if (boardId) {
      // Verify the boardId exists in the user's accessible boards
      const boardExists = boards.some(b => b.id === boardId);
      if (boardExists) {
        setSelectedBoardId(boardId);
      } else if (boards.length > 0) {
        // Board not found, but boards are available - log the issue
        console.warn(`Board ${boardId} not found in user's accessible boards`);
      }
    } else if (boards.length > 0) {
      // Auto-select first board (multi-board mode) if none selected
      setSelectedBoardId(prev => prev || boards[0].id);
    }
  }, [boards, boardId]);
  
  // Use optimistic lists if available, otherwise use server lists
  const lists = optimisticLists.length > 0 ? optimisticLists : serverLists;
  
  // Reset optimistic lists when server data is updated
  useEffect(() => {
    if (optimisticLists.length > 0 && serverLists.length > 0) {
      const serverOrder = serverLists.map(l => l.id).join(',');
      const optimisticOrder = optimisticLists.map(l => l.id).join(',');
      if (serverOrder === optimisticOrder) {
        setOptimisticLists([]);
      }
    }
  }, [serverLists, optimisticLists]);
  
  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  
  // Click-and-drag horizontal scrolling
  const { containerRef, isDragging, handlers: dragScrollHandlers } = useDragScroll();

  // Calculate task stats for the selected board
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && !t.completed
    ).length;
    return { total, completed, overdue };
  }, [tasks]);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (filters.members.length > 0) {
      filtered = filtered.filter(task => 
        task.assignees?.some(assignee => filters.members.includes(assignee.id))
      );
    }
    
    if (filters.tags.length > 0) {
      filtered = filtered.filter(task =>
        task.tags?.some(tag => filters.tags.includes(tag.id))
      );
    }
    
    return filtered;
  }, [tasks, filters]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }
    setActiveId(event.active.id);
    setActiveType(event.active.data.current?.type || 'task');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setOverId(null);
    
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeType = active.data.current?.type;

    // Handle list reordering
    if (activeType === 'list') {
      const oldIndex = lists.findIndex(l => l.id === active.id);
      const newIndex = lists.findIndex(l => l.id === over.id);
      
      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(lists, oldIndex, newIndex);
        
        // Instantly update UI with optimistic state
        setOptimisticLists(newOrder);
        
        // Update database in the background
        reorderLists(newOrder.map(l => l.id)).catch((error) => {
          console.error('Failed to reorder lists:', error);
          // Revert optimistic update on error
          setOptimisticLists([]);
        });
      }
      setActiveId(null);
      setActiveType(null);
      return;
    }

    // Handle task movement between lists
    if (typeof active.id !== 'string') {
      console.error('Expected string ID for task');
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const taskId = active.id;
    let targetListId: string | null = null;

    // Check if we dropped on a list directly
    const list = lists.find(l => l.id === over.id);
    if (list) {
      targetListId = list.id;
    } else {
      // We dropped on a task - find which list that task belongs to
      const targetTask = tasks.find(t => t.id === over.id);
      if (targetTask) {
        targetListId = targetTask.list_id;
      }
    }

    if (targetListId) {
      updateTask({ taskId, updates: { list_id: targetListId } });
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDeleteList = async (listId: string) => {
    setDeleteListId(listId);
  };

  const confirmDeleteList = async () => {
    if (deleteListId) {
      await deleteList(deleteListId);
      setDeleteListId(null);
    }
  };

  const handleDeleteBoard = async () => {
    if (deleteBoardId) {
      await deleteBoard(deleteBoardId);
      setDeleteBoardId(null);
      // Switch to first available board
      const remainingBoards = boards.filter(b => b.id !== deleteBoardId);
      if (remainingBoards.length > 0) {
        setSelectedBoardId(remainingBoards[0].id);
      }
    }
  };

  // Show error state if board is not accessible
  if (boardId && boards.length > 0 && !selectedBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4 p-8">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Board Not Accessible</h2>
          <p className="text-muted-foreground max-w-md">
            This board either doesn't exist or you don't have permission to view it.
            Try signing out and back in, or contact your team admin.
          </p>
          <Button onClick={() => navigate('/tasks/projects')}>
            View All Boards
          </Button>
        </div>
      </div>
    );
  }

  // Show loading/empty state
  if (boards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4 p-8">
          <Grid2X2 className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">No Boards Available</h2>
          <p className="text-muted-foreground max-w-md">
            Loading your boards or you don't have access to any boards yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* Enhanced Board Header */}
      {selectedBoard && (
        <EnhancedBoardHeader
          board={selectedBoard}
          taskStats={taskStats}
          onFilterChange={setFilters}
          onBack={() => navigate('/tasks/projects')}
        />
      )}

      {/* Kanban Board - fills remaining height */}
      <div 
        ref={containerRef}
        className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4 kanban-scroll ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        {...dragScrollHandlers}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex gap-4 pb-4 h-full items-stretch">
            <SortableContext items={lists.map(l => l.id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <SortableTaskListColumn
                  key={list.id}
                  boardId={selectedBoardId}
                  list={list}
                  tasks={filteredTasks.filter(t => t.list_id === list.id)}
                  onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                  onEditList={() => setEditListId(list.id)}
                  onDeleteList={() => handleDeleteList(list.id)}
                  isOver={overId === list.id && activeType === 'task'}
                />
              ))}
            </SortableContext>

            {/* Add New List Button */}
            <Button
              variant="ghost"
              className="min-w-[350px] h-fit border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all p-8 rounded-lg"
              onClick={() => setCreateListDialogOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add List
            </Button>
          </div>

          {/* Drag Overlay with Improved Styling */}
          <DragOverlay dropAnimation={null}>
            {activeId && activeType === 'task' && (
              <div className="rotate-2 scale-105 shadow-2xl opacity-95 cursor-grabbing">
                <TaskBoardCard
                  task={filteredTasks.find((t) => t.id === activeId)}
                  onClick={() => {}}
                />
              </div>
            )}
            {activeId && activeType === 'list' && (
              <div className="w-[320px] h-[200px] bg-white rounded-lg shadow-2xl border-2 border-primary flex items-center justify-center rotate-2 scale-105 opacity-95 cursor-grabbing">
                <p className="text-lg font-semibold">
                  {lists.find((l) => l.id === activeId)?.title}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Dialogs */}
      <CreateBoardDialog
        open={createBoardDialogOpen}
        onOpenChange={setCreateBoardDialogOpen}
        onBoardCreated={(boardId) => setSelectedBoardId(boardId)}
      />

      <EditBoardDialog
        open={editBoardDialogOpen}
        onOpenChange={setEditBoardDialogOpen}
        board={selectedBoard || null}
      />

      <CreateListDialog
        open={createListDialogOpen}
        onOpenChange={setCreateListDialogOpen}
        board={selectedBoard || null}
      />

      <EditListDialog
        open={!!editListId}
        onOpenChange={(open) => !open && setEditListId(null)}
        list={lists.find(l => l.id === editListId) || null}
        board={selectedBoard || null}
      />

      <TaskDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />

      <AlertDialog open={!!deleteListId} onOpenChange={(open) => !open && setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List?</AlertDialogTitle>
            <AlertDialogDescription>
              All tasks in this list will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteList}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete List
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBoardId} onOpenChange={(open) => !open && setDeleteBoardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the board, all its lists, and all tasks within them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

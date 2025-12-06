import { useState, useEffect, useRef } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, ChevronDown } from 'lucide-react';
import { SortableTaskBoardCard } from './SortableTaskBoardCard';
import { InlineTaskInput } from './InlineTaskInput';
import { EmptyTaskState } from './EmptyTaskState';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskListColumnProps {
  boardId?: string | null;
  list: any;
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onEditList?: () => void;
  onDeleteList?: () => void;
  dragAttributes?: any;
  dragListeners?: any;
  dragRef?: (node: HTMLElement | null) => void;
  isOver?: boolean;
}

export const TaskListColumn = ({ 
  boardId,
  list, 
  tasks, 
  onTaskClick, 
  onEditList,
  onDeleteList,
  dragAttributes,
  dragListeners,
  dragRef,
  isOver = false
}: TaskListColumnProps) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const prevCompletedCountRef = useRef(0);
  
  // Active section: Only show incomplete PARENT tasks (subtasks are rendered via SubtaskList)
  const activeTasks = tasks.filter(t => !t.completed && !t.parent_task_id);
  
  // Completed section: Show ALL completed tasks (parents AND subtasks as flat cards)
  const completedTasks = tasks.filter(t => t.completed);

  // Auto-expand completed section when a task is newly completed
  useEffect(() => {
    if (completedTasks.length > prevCompletedCountRef.current && prevCompletedCountRef.current > 0) {
      setShowCompleted(true);
    }
    prevCompletedCountRef.current = completedTasks.length;
  }, [completedTasks.length]);

  return (
    <div 
      ref={dragRef}
      className={cn(
        "flex flex-col w-[350px] shrink-0 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 h-full max-h-full",
        isOver && "ring-2 ring-primary shadow-xl scale-[1.02]"
      )}
    >
      {/* List Header */}
      <div 
        {...dragAttributes}
        {...dragListeners}
        className="flex items-center justify-between p-4 pb-3 border-b cursor-grab hover:bg-gray-50 active:cursor-grabbing"
      >
        <div 
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <h3 className="font-medium text-gray-700 text-sm truncate">{list.title}</h3>
          <span className="text-xs text-gray-400">
            {activeTasks.length}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 shrink-0 hover:bg-gray-100"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem onClick={onEditList}>Edit list</DropdownMenuItem>
            <DropdownMenuItem onClick={onDeleteList} className="text-destructive">
              Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Task Section */}
      {showInput ? (
        <div 
          className="px-4 py-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <InlineTaskInput 
            listId={list.id}
            boardId={boardId}
            onCancel={() => setShowInput(false)}
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start text-primary hover:bg-blue-50 rounded-none px-4 py-3 h-auto font-normal"
          onClick={() => setShowInput(true)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="text-sm">Add a task</span>
        </Button>
      )}

      {/* Tasks - Internal scrolling when needed */}
      <div className="p-4 pt-2 overflow-y-auto flex-1 min-h-0">
        {activeTasks.length === 0 && !showInput ? (
          <EmptyTaskState />
        ) : (
          <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <SortableTaskBoardCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
          
        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded hover:bg-gray-50"
            >
              <span>Completed ({completedTasks.length})</span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform",
                  showCompleted && "rotate-180"
                )} 
              />
            </button>
            
            {showCompleted && (
              <SortableContext items={completedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="mt-2 space-y-2">
                  {completedTasks.map((task) => (
                    <SortableTaskBoardCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

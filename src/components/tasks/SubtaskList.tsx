import { useEffect, useRef } from 'react';
import { SubtaskRow } from './SubtaskRow';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  _autoEdit?: boolean;
  [key: string]: any;
}

interface SubtaskListProps {
  parentTaskId: string;
  subtasks?: Subtask[];
  showOnlyIncomplete?: boolean;
}

export const SubtaskList = ({ 
  parentTaskId, 
  subtasks = [],
  showOnlyIncomplete = false 
}: SubtaskListProps) => {
  const previousSubtasksLength = useRef(subtasks.length);

  // Filter subtasks based on prop
  const visibleSubtasks = showOnlyIncomplete 
    ? subtasks.filter(s => !s.completed) 
    : subtasks;

  // Auto-focus newly created subtasks
  useEffect(() => {
    if (subtasks.length > previousSubtasksLength.current) {
      // A new subtask was just added
      const newestSubtask = subtasks[subtasks.length - 1];
      if (newestSubtask) {
        // Store the ID to trigger auto-edit
        const createdAt = new Date(newestSubtask.created_at).getTime();
        const now = Date.now();
        // If created within last 2 seconds, mark it for auto-edit
        if (now - createdAt < 2000) {
          newestSubtask._autoEdit = true;
        }
      }
    }
    previousSubtasksLength.current = subtasks.length;
  }, [subtasks]);

  const handleSubtaskClick = (subtaskId: string) => {
    // Future: Open task drawer or expand subtask details
    console.log('Subtask clicked:', subtaskId);
  };

  if (visibleSubtasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0.5 pl-8 border-l-2 border-primary/20 ml-4 mt-2 py-1 bg-muted/5 rounded-r">
      {visibleSubtasks.map((subtask: any) => (
        <SubtaskRow 
          key={subtask.id} 
          subtask={subtask}
          parentTaskId={parentTaskId}
          autoEdit={subtask._autoEdit}
        />
      ))}
    </div>
  );
};

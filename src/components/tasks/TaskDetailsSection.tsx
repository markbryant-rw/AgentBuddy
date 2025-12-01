import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { TaskAttachmentsSection } from "./TaskAttachmentsSection";
import { TaskAssigneeSelector } from "./TaskAssigneeSelector";
import { SubtaskList } from "./SubtaskList";
import { toast } from "sonner";

interface TaskDetailsSectionProps {
  task: any;
  hideSubtasks?: boolean;
}

export const TaskDetailsSection = ({ task, hideSubtasks }: TaskDetailsSectionProps) => {
  const { updateTask, addAssignee, removeAssignee } = useTasks();
  const { members: teamMembers } = useTeamMembers();
  const [description, setDescription] = useState(task.description || '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );

  const handleUpdate = async (updates: any) => {
    try {
      await updateTask({
        taskId: task.id,
        updates,
      });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      handleUpdate({ description });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    handleUpdate({ due_date: date ? date.toISOString() : null });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Add a description..."
          className="min-h-[100px]"
        />
      </div>

      {/* Subtasks */}
      {!hideSubtasks && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Subtasks
          </Label>
          <SubtaskList parentTaskId={task.id} />
        </div>
      )}

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          value={task.status}
          onValueChange={(value) => handleUpdate({ status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select 
          value={task.priority || 'medium'}
          onValueChange={(value) => handleUpdate({ priority: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Assignees */}
      <TaskAssigneeSelector
        taskId={task.id}
        selectedAssignees={task.assignees || []}
        onAssigneesChange={async (newAssigneeIds) => {
          const currentIds = task.assignees?.map((a: any) => a.id) || [];
          const toAdd = newAssigneeIds.filter(id => !currentIds.includes(id));
          const toRemove = currentIds.filter(id => !newAssigneeIds.includes(id));
          
          // Execute changes
          for (const assignee of toAdd) {
            const userId = typeof assignee === 'string' ? assignee : assignee.id;
            addAssignee({ taskId: task.id, userId });
          }
          for (const assignee of toRemove) {
            const userId = typeof assignee === 'string' ? assignee : assignee.id;
            removeAssignee({ taskId: task.id, userId });
          }
        }}
      />

      {/* Attachments */}
      <TaskAttachmentsSection taskId={task.id} />

      {/* Metadata */}
      <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
        <div>Created by: {task.creator?.full_name || 'Unknown'}</div>
        <div>Created: {format(new Date(task.created_at), 'PPP')}</div>
        {task.last_updated_by && (
          <div>Last updated: {format(new Date(task.updated_at), 'PPP')}</div>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { CalendarIcon, User, Tag, Flame, Target } from "lucide-react";
import { format, addDays } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTaskLists } from "@/hooks/useTaskLists";
import { useTaskBoards } from "@/hooks/useTaskBoards";
import { TeamMemberCheckboxList } from "./TeamMemberCheckboxList";
import { TagCheckboxList } from "./TagCheckboxList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultListId?: string | null;
}

export const CreateTaskDialog = ({ open, onOpenChange, defaultListId }: CreateTaskDialogProps) => {
  const { createTask } = useTasks();
  const { boards } = useTaskBoards();
  
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [boardId, setBoardId] = useState<string>('');
  const [listId, setListId] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { lists } = useTaskLists(boardId || null);
  const selectedList = lists.find(l => l.id === listId);

  useEffect(() => {
    if (open && defaultListId) {
      setListId(defaultListId);
      // Find the board for this list
      const list = lists.find(l => l.id === defaultListId);
      if (list && 'board_id' in list) {
        setBoardId((list as any).board_id);
      }
    }
  }, [open, defaultListId, lists]);

  // Reset list selection when board changes
  useEffect(() => {
    setListId('');
  }, [boardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (!listId) {
      toast.error('Please select a list');
      return;
    }

    setIsSubmitting(true);
    try {
      const newTask = await createTask({
        title: title.trim(),
        dueDate: dueDate?.toISOString(),
        listId,
        isUrgent,
        isImportant,
      });

      // Add assignees if any selected
      if (selectedAssignees.length > 0 && newTask) {
        await Promise.all(
          selectedAssignees.map(userId => 
            supabase.from('task_assignees').insert({
              task_id: newTask.id,
              user_id: userId,
            })
          )
        );
      }

      // Add tags if any selected
      if (selectedTags.length > 0 && newTask) {
        await Promise.all(
          selectedTags.map(tagId => 
            supabase.from('task_tag_assignments' as any).insert({
              task_id: newTask.id,
              tag_id: tagId,
            })
          )
        );
      }

      // Reset form
      setTitle('');
      setDueDate(addDays(new Date(), 3));
      setBoardId('');
      setListId('');
      setIsUrgent(false);
      setIsImportant(false);
      setSelectedAssignees([]);
      setSelectedTags([]);
      onOpenChange(false);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              autoFocus
              className="h-10"
            />
          </div>

          {/* Board Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Board *</Label>
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select a board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>
                    <span className="flex items-center gap-2">
                      <span>{board.icon}</span>
                      <span>{board.title}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* List Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">List *</Label>
            <Select value={listId} onValueChange={setListId} disabled={!boardId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={boardId ? "Select a list" : "Select a board first"} />
              </SelectTrigger>
              <SelectContent>
                {lists.map(list => (
                  <SelectItem key={list.id} value={list.id}>
                    <span className="flex items-center gap-2">
                      <span>{list.icon}</span>
                      <span>{list.title}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date & Priority - Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal h-10 hover:bg-accent transition-colors"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM dd') : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <div className="flex gap-2">
                <Toggle
                  pressed={isUrgent}
                  onPressedChange={setIsUrgent}
                  aria-label="Toggle urgent"
                  className="flex-1 h-10 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600 dark:data-[state=on]:text-orange-400 data-[state=on]:border-orange-500/50"
                >
                  <Flame className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Urgent</span>
                </Toggle>
                <Toggle
                  pressed={isImportant}
                  onPressedChange={setIsImportant}
                  aria-label="Toggle important"
                  className="flex-1 h-10 data-[state=on]:bg-blue-500/10 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:border-blue-500/50"
                >
                  <Target className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Important</span>
                </Toggle>
              </div>
              {(isUrgent || isImportant) && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {isUrgent && isImportant && '🔴 Critical'}
                  {isUrgent && !isImportant && '🟠 Urgent'}
                  {!isUrgent && isImportant && '🔵 Important'}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            {/* Assignees - Always visible */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assignees</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-10 hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {selectedAssignees.length > 0 
                      ? `${selectedAssignees.length} assigned`
                      : 'Assign to team members'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <TeamMemberCheckboxList
                    selectedIds={selectedAssignees}
                    onChange={setSelectedAssignees}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-10 hover:bg-accent transition-colors"
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    {selectedTags.length > 0 
                      ? `${selectedTags.length} tags`
                      : 'Add tags'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <TagCheckboxList
                    selectedIds={selectedTags}
                    onChange={setSelectedTags}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="h-10"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

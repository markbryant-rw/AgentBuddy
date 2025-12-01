import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Paperclip, User, Lock, Flame, Tag } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useTaskLists } from '@/hooks/useTaskLists';
import { TagSelector } from './TagSelector';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { TaskAttachmentsSection } from './TaskAttachmentsSection';
import { SubtaskList } from './SubtaskList';
import { TaskCommentsSection } from './TaskCommentsSection';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerWithPresets } from './DatePickerWithPresets';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadPastedImage } from '@/lib/imageUpload';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface TaskDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDrawer = ({ taskId, open, onOpenChange }: TaskDrawerProps) => {
  const { tasks, updateTask, completeTask, uncompleteTask } = useTasks();
  const task = tasks.find(t => t.id === taskId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? new Date(task.due_date) : undefined
  );
  const { lists } = useTaskLists();
  
  const list = lists.find(l => l.id === task?.list_id);
  const canAssignOthers = list?.is_shared === true;

  if (!task) return null;

  const handleToggleComplete = async () => {
    if (task.completed) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await updateTask({ taskId: task.id, updates: { title: editedTitle.trim() } });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionSave = async () => {
    if (description !== task.description) {
      await updateTask({ taskId: task.id, updates: { description } });
    }
  };

  const handleDescriptionPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const blob = items[i].getAsFile();
        if (!blob) continue;
        
        try {
          toast.info('Uploading image...');
          const { publicUrl, fileName, fileSize, fileType } = await uploadPastedImage(blob, task.id);
          
          // Insert markdown into description
          const textarea = e.target as HTMLTextAreaElement;
          const cursorPos = textarea.selectionStart;
          const textBefore = description.substring(0, cursorPos);
          const textAfter = description.substring(cursorPos);
          
          const newDescription = `${textBefore}\n![${fileName}](${publicUrl})\n${textAfter}`;
          setDescription(newDescription);
          
          // Save as attachment
          await supabase.from('task_attachments').insert({
            task_id: task.id,
            file_name: fileName,
            file_path: publicUrl,
            file_type: fileType,
            file_size: fileSize,
            uploaded_by: task.created_by
          });
          
          toast.success('Image pasted and uploaded');
        } catch (error) {
          toast.error('Failed to upload pasted image');
        }
      }
    }
  };

  const handleDateChange = async (date: Date | undefined) => {
    setDueDate(date);
    await updateTask({ taskId: task.id, updates: { due_date: date?.toISOString() } });
  };

  const handleUrgencyToggle = async (type: 'urgent' | 'important', checked: boolean) => {
    // Note: urgency/importance will need to be added to the database schema
    const updates: any = {};
    if (type === 'urgent') {
      updates.is_urgent = checked;
    } else {
      updates.is_important = checked;
    }
    await updateTask({ taskId: task.id, updates });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={handleToggleComplete}
              className="mt-1"
            />
            {/* Editable Title */}
            <div className="flex-1">
              {!isEditingTitle ? (
                <h2 
                  className="text-2xl font-semibold cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {task.title}
                </h2>
              ) : (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  className="text-2xl font-semibold h-auto py-1"
                />
              )}
            </div>
          </div>
          
          {/* Action Icons Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
            {/* Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {dueDate ? format(dueDate, 'MMM d') : 'Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerWithPresets
                  selected={dueDate}
                  onSelect={handleDateChange}
                />
              </PopoverContent>
            </Popover>

            {/* Assignees */}
            {canAssignOthers ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Assignees
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <TaskAssigneeSelector taskId={task.id} />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 rounded">
                <Lock className="h-4 w-4" />
                <span>Personal list</span>
              </div>
            )}

            {/* Tags */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <TagSelector
                  taskId={task.id}
                  selectedTags={task.tags || []}
                  onTagsChange={() => {}}
                />
              </PopoverContent>
            </Popover>

            {/* Urgency/Importance */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Flame className="h-4 w-4 mr-2" />
                  Urgency
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={(task as any).is_urgent}
                      onCheckedChange={(checked) => handleUrgencyToggle('urgent', checked as boolean)}
                    />
                    <label className="text-sm font-medium">Urgent</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={(task as any).is_important}
                      onCheckedChange={(checked) => handleUrgencyToggle('important', checked as boolean)}
                    />
                    <label className="text-sm font-medium">Important</label>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {(task as any).is_urgent && (task as any).is_important && '🔴 Critical'}
                    {(task as any).is_urgent && !(task as any).is_important && '🟠 Urgent'}
                    {!(task as any).is_urgent && (task as any).is_important && '🔵 Important'}
                    {!(task as any).is_urgent && !(task as any).is_important && '⚪ Normal'}
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Attach */}
            <Button variant="ghost" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description with Image Paste Support */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onPaste={handleDescriptionPaste}
              placeholder="Add a description... (Paste images directly!)"
              className="min-h-[120px]"
            />
            {description && description.includes('![') && (
              <div className="prose prose-sm max-w-none border rounded-lg p-3 bg-muted/30">
                <ReactMarkdown
                  components={{
                    img: ({ node, ...props }) => (
                      <img 
                        {...props} 
                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        alt={props.alt || 'Pasted image'}
                      />
                    )
                  }}
                >
                  {description}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Subtasks - Always Inline */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Subtasks</Label>
            <SubtaskList parentTaskId={task.id} />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Comments</Label>
            <TaskCommentsSection taskId={task.id} />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Attachments</Label>
            <TaskAttachmentsSection taskId={task.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

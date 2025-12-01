import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description?: string;
    section: string;
    due_date?: string;
    priority?: string;
    assigned_to?: string;
  } | null;
  onSubmit: (taskId: string, updates: {
    title: string;
    description?: string;
    section: string;
    due_date?: string | null;
    priority?: string;
    assigned_to?: string | null;
  }) => void;
  existingSections: string[];
  teamMembers: Array<{
    user_id: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
    };
  }>;
}

export const EditTaskDialog = ({ 
  open, 
  onOpenChange, 
  task,
  onSubmit, 
  existingSections,
  teamMembers 
}: EditTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('General');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState<string>('UNASSIGNED');

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setSection(task.section || 'General');
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setPriority(task.priority || 'medium');
      setAssignedTo(task.assigned_to || 'UNASSIGNED');
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    onSubmit(task.id, {
      title: title.trim(),
      section: section || 'General',
      due_date: dueDate?.toISOString().split('T')[0] || null,
      priority,
      assigned_to: assignedTo === 'UNASSIGNED' ? null : assignedTo,
    });

    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details, assignment, and due date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Task Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Contact solicitor"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-section">Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                {existingSections.filter(s => s !== 'General').map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-assigned">Assigned To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "No due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDueDate(undefined)}
                className="w-full"
              >
                Clear due date
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Low</SelectItem>
                <SelectItem value="medium">⚪ Medium</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

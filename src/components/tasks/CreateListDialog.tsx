import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTaskLists } from '@/hooks/useTaskLists';

interface TaskBoard {
  id: string;
  title: string;
  is_shared: boolean;
}

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: TaskBoard | null;
}

const colorOptions = [
  { name: 'Slate', value: '#64748b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
];

export const CreateListDialog = ({ open, onOpenChange, board }: CreateListDialogProps) => {
  const { createList } = useTaskLists();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !board) return;

    setIsSubmitting(true);
    try {
      await createList({
        title: title.trim(),
        description: description.trim() || null,
        color,
        icon: 'list',
        order_position: 999,
        is_shared: board.is_shared,
        board_id: board.id,
      });
      setTitle('');
      setDescription('');
      setColor('#3b82f6');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">List Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., To Do, In Progress, Done"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: option.value,
                    borderColor: color === option.value ? 'hsl(var(--primary))' : 'transparent',
                  }}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          {board && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 px-1">
              {board.is_shared ? (
                <>
                  <span className="text-primary">●</span>
                  Lists in this board are shared with your team
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">●</span>
                  Lists in this board are private
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              Create List
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

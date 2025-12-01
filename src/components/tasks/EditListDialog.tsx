import { useState, useEffect } from 'react';
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

interface EditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: any | null;
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

export const EditListDialog = ({ open, onOpenChange, list, board }: EditListDialogProps) => {
  const { updateList } = useTaskLists();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (list) {
      setTitle(list.title || '');
      setDescription(list.description || '');
      setColor(list.color || '#3b82f6');
    }
  }, [list]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !list) return;

    setIsSubmitting(true);
    try {
      await updateList({
        id: list.id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          color,
        },
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
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
                  This list is shared with your team (inherited from board)
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">●</span>
                  This list is private (inherited from board)
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

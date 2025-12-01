import { useState, useEffect } from 'react';
import { useTaskBoards, type TaskBoard } from '@/hooks/useTaskBoards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface EditBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: TaskBoard | null;
}

const BOARD_ICONS = ['📋', '📊', '🎯', '📝', '✅', '🗓️', '📌', '⚡', '🚀', '💼'];
const BOARD_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

export const EditBoardDialog = ({ open, onOpenChange, board }: EditBoardDialogProps) => {
  const { updateBoard } = useTaskBoards();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#3b82f6');
  const [isShared, setIsShared] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when board changes
  useEffect(() => {
    if (board) {
      setTitle(board.title);
      setDescription(board.description || '');
      setIcon(board.icon);
      setColor(board.color);
      setIsShared(board.is_shared);
    }
  }, [board]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !board) return;

    setIsSubmitting(true);
    try {
      await updateBoard({
        id: board.id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          icon,
          color,
          is_shared: isShared,
        },
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Board</DialogTitle>
          <DialogDescription>
            Update your board's details and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Board Name */}
          <div className="space-y-2">
            <Label htmlFor="title">Board Name *</Label>
            <Input
              id="title"
              placeholder="e.g., VA Mon-Fri Tasks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110 ${
                    icon === emoji ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    color === c.value ? 'border-foreground ring-2 ring-offset-2 ring-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this board for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Sharing Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="is-shared" className="text-base">
                {isShared ? 'Shared with Team' : 'Private Board'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isShared 
                  ? 'All team members can view and edit tasks on this board'
                  : 'Only you can see this board and its tasks'}
              </p>
            </div>
            <Switch
              id="is-shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

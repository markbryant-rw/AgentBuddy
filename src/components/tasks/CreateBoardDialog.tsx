import { useState } from 'react';
import { useTaskBoards } from '@/hooks/useTaskBoards';
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
import { Lock, Users } from 'lucide-react';

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoardCreated?: (boardId: string) => void;
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

export const CreateBoardDialog = ({ open, onOpenChange, onBoardCreated }: CreateBoardDialogProps) => {
  const { createBoard } = useTaskBoards();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#3b82f6');
  const [isShared, setIsShared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const board = await createBoard({
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        is_shared: isShared,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setIcon('📋');
      setColor('#3b82f6');
      setIsShared(true);
      
      onOpenChange(false);
      onBoardCreated?.((board as any).id);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Create a new task board for your team. You can organize tasks by projects, workflows, or any other structure.
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
          <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
            isShared ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
          }`}>
            <div className="flex items-start gap-3 flex-1">
              {isShared ? (
                <Users className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div className="space-y-1">
                <Label htmlFor="is-shared" className="text-base font-semibold cursor-pointer">
                  {isShared ? 'Team Board' : 'Private Board'}
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isShared 
                    ? 'Team members can view and edit. Tasks inherit this setting.'
                    : 'Only visible to you. Tasks remain private.'}
                </p>
              </div>
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
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

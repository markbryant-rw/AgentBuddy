import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useTaskBoards } from '@/hooks/useTaskBoards';

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['📋', '🎯', '🚀', '💼', '🏆', '📊', '🎨', '🔧', '📱', '💡'];

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [isShared, setIsShared] = useState(true);
  const { createBoard } = useTaskBoards();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createBoard({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      is_shared: isShared,
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setIcon('📋');
    setIsShared(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Board Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Marketing Campaign"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board for?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                    icon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="shared">Shared Board</Label>
              <p className="text-xs text-muted-foreground">
                Allow team members to collaborate
              </p>
            </div>
            <Switch
              id="shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

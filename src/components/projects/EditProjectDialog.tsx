import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProjects, Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

const EMOJI_OPTIONS = ['📋', '🎯', '🚀', '💼', '🏆', '📊', '🎨', '🔧', '📱', '💡', '🏠', '📈', '✨', '🔥'];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#6366f1');
  const [isShared, setIsShared] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateProject } = useProjects();

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description || '');
      setIcon(project.icon || '📋');
      setColor(project.color || '#6366f1');
      setIsShared(project.is_shared ?? true);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !project || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateProject({
        id: project.id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          icon,
          color,
          is_shared: isShared,
        },
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            Edit Project
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Project Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 Marketing Campaign"
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this project for?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'text-xl p-2 rounded-lg border-2 transition-all hover:scale-110',
                    icon === emoji
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-muted'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all hover:scale-110',
                    color === c && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="shared" className="font-medium">Team Project</Label>
              <p className="text-xs text-muted-foreground">
                {isShared ? 'Visible to all team members' : 'Only you can see this project'}
              </p>
            </div>
            <Switch
              id="shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || isSubmitting}
              style={{ backgroundColor: color }}
              className="text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

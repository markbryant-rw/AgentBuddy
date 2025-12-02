import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNoteTemplates } from '@/hooks/useNoteTemplates';
import { useTeam } from '@/hooks/useTeam';
import { Lock, Users } from 'lucide-react';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  noteContent: any;
}

const CATEGORIES = [
  { value: 'meetings', label: 'Meetings', icon: '📅' },
  { value: 'listings', label: 'Listings', icon: '🏠' },
  { value: 'events', label: 'Events', icon: '🎤' },
  { value: 'vendors', label: 'Vendors', icon: '🤝' },
  { value: 'personal', label: 'Personal', icon: '📝' },
  { value: 'general', label: 'General', icon: '📄' },
];

export const SaveTemplateDialog = ({
  open,
  onOpenChange,
  noteTitle,
  noteContent,
}: SaveTemplateDialogProps) => {
  const { createTemplate } = useNoteTemplates();
  const { team } = useTeam();
  const [title, setTitle] = useState(noteTitle);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [visibility, setVisibility] = useState<'personal' | 'team'>('personal');

  const handleSave = async () => {
    createTemplate.mutate({
      title,
      description: description || undefined,
      content_rich: noteContent,
      category,
      team_id: visibility === 'team' ? team?.id : null,
    });
    onOpenChange(false);
    // Reset form
    setTitle('');
    setDescription('');
    setCategory('general');
    setVisibility('personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this note as a reusable template for future use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Template Name *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Client Discovery Call"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibility *</Label>
            <RadioGroup value={visibility} onValueChange={(value: any) => setVisibility(value)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Lock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Personal</div>
                    <div className="text-sm text-muted-foreground">Only you can use this template</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Users className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Team</div>
                    <div className="text-sm text-muted-foreground">Everyone on your team can use this template</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div className="mt-2 text-sm">
              This template will be saved with your current note content and formatting.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title || createTemplate.isPending}
          >
            {createTemplate.isPending ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

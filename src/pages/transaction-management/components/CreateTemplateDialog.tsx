import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectTemplates } from '@/hooks/useProjectTemplates';
import { TemplateBuilder } from './TemplateBuilder';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTemplateDialog = ({ open, onOpenChange }: CreateTemplateDialogProps) => {
  const { createTemplate } = useProjectTemplates();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lifecycleStage, setLifecycleStage] = useState('live');
  const [tasks, setTasks] = useState<Array<{ title: string; priority: string; due_offset_days: number; description?: string }>>([
    { title: '', priority: 'medium', due_offset_days: 0 }
  ]);

  const handleSubmit = async () => {
    if (!name || tasks.length === 0 || !tasks.every(t => t.title)) {
      return;
    }

    await createTemplate({
      name,
      description: description || null,
      lifecycle_stage: lifecycleStage,
      tasks: tasks.filter(t => t.title.trim()),
      team_id: null,
      is_system_default: false,
    });

    onOpenChange(false);
    setName('');
    setDescription('');
    setLifecycleStage('live');
    setTasks([{ title: '', priority: 'medium', due_offset_days: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Listing-to-Launch"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is used for..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage">Lifecycle Stage Trigger *</Label>
            <Select value={lifecycleStage} onValueChange={setLifecycleStage}>
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="contract">Under Contract</SelectItem>
                <SelectItem value="unconditional">Unconditional</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tasks *</Label>
            <TemplateBuilder tasks={tasks} onTasksChange={setTasks} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!name || tasks.length === 0 || !tasks.every(t => t.title)}
            >
              Create Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

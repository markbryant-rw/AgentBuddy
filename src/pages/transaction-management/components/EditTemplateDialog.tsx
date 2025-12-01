import { useState, useEffect } from 'react';
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
import { useProjectTemplates, ProjectTemplate } from '@/hooks/useProjectTemplates';
import { TemplateBuilder } from './TemplateBuilder';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate;
}

export const EditTemplateDialog = ({ open, onOpenChange, template }: EditTemplateDialogProps) => {
  const { updateTemplate } = useProjectTemplates();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [lifecycleStage, setLifecycleStage] = useState(template.lifecycle_stage);
  const [tasks, setTasks] = useState(template.tasks || []);

  useEffect(() => {
    setName(template.name);
    setDescription(template.description || '');
    setLifecycleStage(template.lifecycle_stage);
    setTasks(template.tasks || []);
  }, [template]);

  const handleSubmit = async () => {
    if (!name || tasks.length === 0 || !tasks.every(t => t.title)) {
      return;
    }

    await updateTemplate({
      id: template.id,
      updates: {
        name,
        description: description || null,
        lifecycle_stage: lifecycleStage,
        tasks: tasks.filter(t => t.title.trim()),
        template_version: template.template_version,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
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
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

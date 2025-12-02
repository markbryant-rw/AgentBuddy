import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { TaskSuggestions } from './TaskSuggestions';
import { useTasks } from '@/hooks/useTasks';
import { Sparkles } from 'lucide-react';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProjectDialog = ({ open, onOpenChange }: CreateProjectDialogProps) => {
  const { createProject } = useProjects();
  const { createTask } = useTasks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    due_date: '',
  });

  const handleNext = () => {
    if (formData.title.trim()) {
      setShowAI(true);
    }
  };

  const handleGenerateAI = async () => {
    setIsLoadingAI(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-task-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          projectTitle: formData.title,
          projectDescription: formData.description,
        }),
      });
      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleAcceptSuggestions = async (selectedTasks: any[]) => {
    setIsSubmitting(true);
    try {
      const project = await createProject({
        title: formData.title,
        description: formData.description || undefined,
        status: 'active',
      });
      
      for (const task of selectedTasks) {
        await createTask({
          title: task.title,
          listId: project.id,
        });
      }
      
      setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowAI(false);
      setAiSuggestions([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await createProject({
        title: formData.title,
        description: formData.description || undefined,
        status: 'active',
      });
      setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowAI(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Website Redesign"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project goals and scope..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          {!showAI ? (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleNext} disabled={!formData.title.trim()}>
                Next <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  ✨ Would you like help generating a starter task list?
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleSkip}>Skip & Create Empty</Button>
                  <Button onClick={handleGenerateAI} disabled={isLoadingAI}>
                    {isLoadingAI ? 'Generating...' : 'Generate Tasks'}
                  </Button>
                </div>
              </div>
              {aiSuggestions.length > 0 && (
                <TaskSuggestions
                  suggestions={aiSuggestions}
                  onAccept={handleAcceptSuggestions}
                  onSkip={handleSkip}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

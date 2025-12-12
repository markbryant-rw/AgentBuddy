import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  ListTodo,
  Search,
  Globe,
  Edit,
  Trash2,
  GripVertical,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppraisalStage, AppraisalTemplateTask, APPRAISAL_STAGES, APPRAISAL_STAGE_DISPLAY_NAMES } from '@/hooks/useAppraisalTemplates';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';

const STAGE_COLORS: Record<AppraisalStage, string> = {
  'VAP': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'MAP': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'LAP': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

interface SystemTemplate {
  id: string;
  name: string;
  description: string | null;
  stage: AppraisalStage;
  tasks: AppraisalTemplateTask[];
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

const SystemAppraisalTemplates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AppraisalStage | 'all'>('all');
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch system templates only
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['system-appraisal-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_stage_templates')
        .select('*')
        .eq('is_system_template', true)
        .order('stage', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(t => ({
        ...t,
        tasks: (Array.isArray(t.tasks) ? t.tasks : []) as unknown as AppraisalTemplateTask[],
      })) as SystemTemplate[];
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SystemTemplate> }) => {
      const { data, error } = await supabase
        .from('appraisal_stage_templates')
        .update({
          name: updates.name,
          description: updates.description,
          stage: updates.stage,
          tasks: updates.tasks as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-appraisal-templates'] });
      queryClient.invalidateQueries({ queryKey: ['appraisal-templates'] });
      toast.success('System template updated');
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast.error('Failed to update template');
      console.error(error);
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = stageFilter === 'all' || t.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleEditTemplate = (template: SystemTemplate) => {
    setEditingTemplate({ ...template });
    setIsEditDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplate.mutate({
      id: editingTemplate.id,
      updates: {
        name: editingTemplate.name,
        description: editingTemplate.description,
        stage: editingTemplate.stage,
        tasks: editingTemplate.tasks,
      },
    });
  };

  const handleUpdateTask = (index: number, field: keyof AppraisalTemplateTask, value: any) => {
    if (!editingTemplate) return;
    const updatedTasks = [...editingTemplate.tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, tasks: updatedTasks });
  };

  const handleAddTask = () => {
    if (!editingTemplate) return;
    const newTask: AppraisalTemplateTask = {
      title: '',
      section: 'General',
      due_offset_days: 0,
      priority: 'medium',
    };
    setEditingTemplate({ 
      ...editingTemplate, 
      tasks: [...editingTemplate.tasks, newTask] 
    });
  };

  const handleRemoveTask = (index: number) => {
    if (!editingTemplate) return;
    const updatedTasks = editingTemplate.tasks.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, tasks: updatedTasks });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/platform-admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            System Appraisal Templates
          </h1>
          <p className="text-muted-foreground">
            Manage platform-wide default templates for all teams
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>System templates</strong> serve as defaults for all teams. Teams can duplicate and customize 
          these templates, but cannot modify or delete the originals. Changes here will affect all teams 
          that haven't created their own custom templates.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as AppraisalStage | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {APPRAISAL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <span>{s}</span>
                  <StageInfoTooltip stage={s} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No System Templates Found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || stageFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'System templates should be seeded automatically'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleEditTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={STAGE_COLORS[template.stage]}>
                        {template.stage}
                      </Badge>
                      <StageInfoTooltip stage={template.stage} />
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
                        <Globe className="h-3 w-3" />
                        System
                      </Badge>
                    </div>
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ListTodo className="h-4 w-4" />
                  <span>{template.tasks.length} tasks</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit System Template</DialogTitle>
            <DialogDescription>
              Modify this system-wide template. Changes will apply to all teams using this as their default.
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select 
                    value={editingTemplate.stage} 
                    onValueChange={(v) => setEditingTemplate({ ...editingTemplate, stage: v as AppraisalStage })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPRAISAL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {APPRAISAL_STAGE_DISPLAY_NAMES[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Describe what this template is for..."
                  rows={2}
                />
              </div>

              {/* Tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Tasks ({editingTemplate.tasks.length})</Label>
                  <Button variant="outline" size="sm" onClick={handleAddTask}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingTemplate.tasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={task.title}
                            onChange={(e) => handleUpdateTask(index, 'title', e.target.value)}
                            placeholder="Task title"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Due Offset (days)</Label>
                          <Input
                            type="number"
                            value={task.due_offset_days ?? 0}
                            onChange={(e) => handleUpdateTask(index, 'due_offset_days', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Priority</Label>
                          <Select 
                            value={task.priority || 'medium'} 
                            onValueChange={(v) => handleUpdateTask(index, 'priority', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-xs">Section</Label>
                          <Input
                            value={task.section}
                            onChange={(e) => handleUpdateTask(index, 'section', e.target.value)}
                            placeholder="e.g., Preparation, Follow-up"
                          />
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveTask(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemAppraisalTemplates;

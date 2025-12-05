import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Save, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { 
  useAppraisalTemplates, 
  AppraisalStage, 
  AppraisalTemplateTask,
  APPRAISAL_STAGES,
  APPRAISAL_STAGE_DISPLAY_NAMES 
} from '@/hooks/useAppraisalTemplates';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { toast } from 'sonner';

const AppraisalTemplateEditor = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();
  const isNew = templateId === 'new';
  
  const { templates, createTemplate, updateTemplate, isLoading } = useAppraisalTemplates();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<AppraisalStage>('VAP');
  const [tasks, setTasks] = useState<AppraisalTemplateTask[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Section state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newSectionName, setNewSectionName] = useState('');

  // Load existing template or duplicate
  useEffect(() => {
    if (isNew) {
      // Check for duplicate state or preset stage
      const state = location.state as { duplicate?: typeof templates[0]; stage?: AppraisalStage } | null;
      if (state?.duplicate) {
        setName(`${state.duplicate.name} (Copy)`);
        setDescription(state.duplicate.description || '');
        setStage(state.duplicate.stage);
        setTasks(state.duplicate.tasks);
      } else if (state?.stage) {
        setStage(state.stage);
      }
    } else if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setStage(template.stage);
        setTasks(template.tasks);
        setIsDefault(template.is_default);
        // Expand all sections by default
        const sections = new Set(template.tasks.map(t => t.section));
        setExpandedSections(sections);
      }
    }
  }, [isNew, templateId, templates, location.state]);

  // Group tasks by section
  const tasksBySection = tasks.reduce((acc, task, index) => {
    const section = task.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push({ ...task, originalIndex: index });
    return acc;
  }, {} as Record<string, (AppraisalTemplateTask & { originalIndex: number })[]>);

  const sections = Object.keys(tasksBySection);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        await createTemplate.mutateAsync({
          name,
          description: description || null,
          stage,
          tasks,
          is_default: isDefault,
          team_id: null, // Will be set in the hook
          created_by: null,
        });
        toast.success('Template created');
      } else if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          updates: { name, description, stage, tasks, is_default: isDefault },
        });
        toast.success('Template saved');
      }
      navigate('/appraisal-templates');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addTask = (section: string) => {
    setTasks([...tasks, {
      title: '',
      section,
      due_offset_days: 0,
      priority: 'medium',
    }]);
  };

  const updateTask = (index: number, updates: Partial<AppraisalTemplateTask>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const addSection = () => {
    if (!newSectionName.trim()) return;
    // Add an empty task to create the section
    setTasks([...tasks, {
      title: '',
      section: newSectionName.toUpperCase(),
      due_offset_days: 0,
      priority: 'medium',
    }]);
    setExpandedSections(new Set([...expandedSections, newSectionName.toUpperCase()]));
    setNewSectionName('');
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent, index: number, section: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Add new task after current one in same section
      const newTask: AppraisalTemplateTask = {
        title: '',
        section,
        due_offset_days: 0,
        priority: 'medium',
      };
      const newTasks = [...tasks];
      newTasks.splice(index + 1, 0, newTask);
      setTasks(newTasks);
    }
  };

  return (
    <div className="min-h-screen">
      <WorkspaceHeader workspace="prospect" currentPage={isNew ? 'New Template' : name || 'Edit Template'} />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isNew ? 'Create Template' : 'Edit Template'}</h1>
            <p className="text-muted-foreground">{isNew ? 'Create a new appraisal task template' : `Editing: ${name}`}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/appraisal-templates')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar - Template Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Standard VAP Tasks"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={stage} onValueChange={(v) => setStage(v as AppraisalStage)}>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{tasks.length} tasks</Badge>
                    <Badge variant="outline">{sections.length} sections</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Section</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name..."
                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                  />
                  <Button size="icon" onClick={addSection}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Tasks */}
          <div className="space-y-4">
            {sections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No tasks yet. Add a section to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              sections.map((section) => (
                <Collapsible 
                  key={section}
                  open={expandedSections.has(section)}
                  onOpenChange={() => toggleSection(section)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedSections.has(section) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <CardTitle className="text-base">{section}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {tasksBySection[section].length}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              addTask(section);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Task
                          </Button>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3 pt-0">
                        {tasksBySection[section].map((task) => (
                          <div 
                            key={task.originalIndex}
                            className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg"
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                            <div className="flex-1 space-y-2">
                              <Input
                                value={task.title}
                                onChange={(e) => updateTask(task.originalIndex, { title: e.target.value })}
                                placeholder="Task title..."
                                onKeyDown={(e) => handleTaskKeyDown(e, task.originalIndex, section)}
                              />
                              <div className="flex gap-2 items-center">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={task.due_offset_days ?? 0}
                                    onChange={(e) => updateTask(task.originalIndex, { 
                                      due_offset_days: parseInt(e.target.value) || 0 
                                    })}
                                    className="w-20"
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    days
                                  </span>
                                </div>
                                <Select
                                  value={task.priority || 'medium'}
                                  onValueChange={(v) => updateTask(task.originalIndex, { priority: v })}
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeTask(task.originalIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppraisalTemplateEditor;

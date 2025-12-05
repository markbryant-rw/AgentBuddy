import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Save, 
  Plus, 
  ArrowLeft,
  ListTodo,
  Settings,
} from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { 
  useAppraisalTemplates, 
  AppraisalStage, 
  AppraisalTemplateTask,
  APPRAISAL_STAGES,
  APPRAISAL_STAGE_DISPLAY_NAMES 
} from '@/hooks/useAppraisalTemplates';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { AppraisalTemplateSidebar } from '@/components/appraisals/templates/AppraisalTemplateSidebar';
import { AppraisalCollapsibleTaskSection } from '@/components/appraisals/templates/AppraisalCollapsibleTaskSection';
import { toast } from 'sonner';

const AppraisalTemplateEditor = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();
  const isNew = templateId === 'new';
  
  const { templates, createTemplate, updateTemplate } = useAppraisalTemplates();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<AppraisalStage>('VAP');
  const [tasks, setTasks] = useState<AppraisalTemplateTask[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  
  // New section input
  const [newSectionName, setNewSectionName] = useState('');

  // Load existing template or duplicate
  useEffect(() => {
    if (isNew) {
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
      }
    }
  }, [isNew, templateId, templates, location.state]);

  // Group tasks by section with original indices
  const tasksBySection = tasks.reduce((acc, task, index) => {
    const section = task.section || 'GENERAL';
    if (!acc[section]) acc[section] = [];
    acc[section].push({ ...task, _originalIndex: index });
    return acc;
  }, {} as Record<string, (AppraisalTemplateTask & { _originalIndex: number })[]>);

  const sections = Object.keys(tasksBySection);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        navigate('/appraisal-templates');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, description, stage, tasks, isDefault]);

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
          team_id: null,
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
      setHasChanges(false);
      navigate('/appraisal-templates');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTask = useCallback((index: number, updates: Partial<AppraisalTemplateTask>) => {
    setTasks(prev => {
      const newTasks = [...prev];
      newTasks[index] = { ...newTasks[index], ...updates };
      return newTasks;
    });
    setHasChanges(true);
  }, []);

  const removeTask = useCallback((index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }, []);

  const addTaskToSection = useCallback((section: string) => {
    setTasks(prev => [...prev, {
      title: '',
      section,
      due_offset_days: 0,
      priority: 'medium',
    }]);
    setHasChanges(true);
  }, []);

  const addSection = () => {
    if (!newSectionName.trim()) return;
    const sectionName = newSectionName.trim().toUpperCase();
    setTasks(prev => [...prev, {
      title: '',
      section: sectionName,
      due_offset_days: 0,
      priority: 'medium',
    }]);
    setNewSectionName('');
    setHasChanges(true);
  };

  const renameSection = useCallback((oldName: string, newName: string) => {
    setTasks(prev => prev.map(task => 
      task.section === oldName ? { ...task, section: newName } : task
    ));
    setHasChanges(true);
  }, []);

  const deleteSection = useCallback((section: string) => {
    setTasks(prev => prev.filter(task => task.section !== section));
    setHasChanges(true);
  }, []);

  const reorderTasks = useCallback((oldIndex: number, newIndex: number, section: string) => {
    const sectionTasks = tasksBySection[section];
    if (!sectionTasks) return;
    
    const oldTaskOriginalIndex = sectionTasks[oldIndex]._originalIndex;
    const newTaskOriginalIndex = sectionTasks[newIndex]._originalIndex;
    
    setTasks(prev => {
      const newTasks = [...prev];
      const [movedTask] = newTasks.splice(oldTaskOriginalIndex, 1);
      // Adjust target index if moving from before to after
      const adjustedNewIndex = oldTaskOriginalIndex < newTaskOriginalIndex 
        ? newTaskOriginalIndex - 1 
        : newTaskOriginalIndex;
      newTasks.splice(adjustedNewIndex, 0, movedTask);
      return newTasks;
    });
    setHasChanges(true);
  }, [tasksBySection]);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const element = document.getElementById(`section-${section.replace(/\s/g, '-')}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <WorkspaceHeader workspace="prospect" currentPage={isNew ? 'New Template' : name || 'Edit Template'} />
      
      {/* Top Info Bar */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/appraisal-templates')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
              placeholder="Template name..."
              className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 w-64 px-0"
            />
            <Select value={stage} onValueChange={(v) => { setStage(v as AppraisalStage); setHasChanges(true); }}>
              <SelectTrigger className="w-36">
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Default</span>
              <Switch 
                checked={isDefault} 
                onCheckedChange={(v) => { setIsDefault(v); setHasChanges(true); }} 
              />
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">Unsaved changes</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">⌘S to save</span>
            <Button variant="outline" onClick={() => navigate('/appraisal-templates')}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AppraisalTemplateSidebar
          sections={sections}
          tasksBySection={tasksBySection}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
          totalTasks={tasks.length}
        />

        {/* Main Editor */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-6 py-2">
              <TabsList>
                <TabsTrigger value="tasks" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tasks" className="flex-1 overflow-auto p-6 space-y-6">
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {tasks.length} tasks across {sections.length} sections
                </p>
              </div>

              {/* Sections */}
              {sections.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a section to get started building your template
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sections.map((section, index) => (
                    <AppraisalCollapsibleTaskSection
                      key={section}
                      section={section}
                      sectionIndex={index}
                      tasks={tasksBySection[section]}
                      onUpdateTask={updateTask}
                      onRemoveTask={removeTask}
                      onAddTask={() => addTaskToSection(section)}
                      onRenameSection={renameSection}
                      onDeleteSection={deleteSection}
                      onReorderTasks={reorderTasks}
                    />
                  ))}
                </div>
              )}

              {/* Add Section */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value.toUpperCase())}
                  placeholder="New section name..."
                  className="max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && addSection()}
                />
                <Button onClick={addSection} disabled={!newSectionName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto p-6">
              <div className="max-w-xl space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name</label>
                  <Input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                    placeholder="e.g., Standard VAP Tasks"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stage</label>
                  <Select value={stage} onValueChange={(v) => { setStage(v as AppraisalStage); setHasChanges(true); }}>
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
                  <p className="text-xs text-muted-foreground">
                    This template will be available for appraisals in the {APPRAISAL_STAGE_DISPLAY_NAMES[stage]} stage
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                    placeholder="Optional description for this template..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Default Template</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically apply this template when appraisals enter the {stage} stage
                    </p>
                  </div>
                  <Switch 
                    checked={isDefault} 
                    onCheckedChange={(v) => { setIsDefault(v); setHasChanges(true); }} 
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AppraisalTemplateEditor;

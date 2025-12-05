import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTransactionTemplates, TransactionTemplate, TransactionStage } from '@/hooks/useTransactionTemplates';
import { useProfile } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { TemplateSidebar } from '@/components/transaction-management/TemplateSidebar';
import { CollapsibleTaskSection } from '@/components/transaction-management/CollapsibleTaskSection';
import { DocumentBuilder, TransactionDocument } from '@/components/transaction-management/DocumentBuilder';
import { TransactionTask } from '@/components/transaction-management/TransactionTaskBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const stageLabels: Record<TransactionStage, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
};


export default function TemplateEditor() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isNewTemplate = templateId === 'new';
  
  const { profile } = useProfile();
  const { hasRole } = useUserRoles();
  const { templates, createTemplate, updateTemplate, setTemplateAsDefault } = useTransactionTemplates();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<TransactionStage>('signed');
  const [tasks, setTasks] = useState<TransactionTask[]>([]);
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const template = useMemo(() => 
    templates.find(t => t.id === templateId),
    [templates, templateId]
  );

  const isSystemTemplate = template?.is_system_template || false;
  const isPlatformAdmin = hasRole('platform_admin');
  const canEdit = isNewTemplate || !isSystemTemplate || isPlatformAdmin;

  // Fetch team members for assignee dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', profile?.primary_team_id],
    queryFn: async () => {
      if (!profile?.primary_team_id) return [];
      const { data } = await supabase
        .from('team_members')
        .select('user_id, profiles(id, full_name, email)')
        .eq('team_id', profile.primary_team_id);
      return data || [];
    },
    enabled: !!profile?.primary_team_id
  });

  // Load template data
  useEffect(() => {
    if (template && !isNewTemplate) {
      setName(template.name);
      setDescription(template.description || '');
      setStage(template.stage);
      setTasks(template.tasks || []);
      setDocuments(template.documents || []);
      setIsDefault(template.is_default);
      setHasChanges(false);
    } else if (isNewTemplate) {
      setName('');
      setDescription('');
      setStage('signed');
      setTasks([]);
      setDocuments([]);
      setIsDefault(false);
      setHasChanges(false);
    }
  }, [template, isNewTemplate]);

  // Track changes
  useEffect(() => {
    if (!isNewTemplate && template) {
      const changed = 
        name !== template.name ||
        description !== (template.description || '') ||
        stage !== template.stage ||
        JSON.stringify(tasks) !== JSON.stringify(template.tasks) ||
        JSON.stringify(documents) !== JSON.stringify(template.documents) ||
        isDefault !== template.is_default;
      setHasChanges(changed);
    } else if (isNewTemplate) {
      setHasChanges(name.trim().length > 0 || tasks.length > 0 || documents.length > 0);
    }
  }, [name, description, stage, tasks, documents, isDefault, template, isNewTemplate]);

  // Group tasks by section
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, TransactionTask[]> = {};
    tasks.forEach((task, index) => {
      const section = task.section || 'GETTING STARTED';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push({ ...task, _originalIndex: index } as any);
    });
    return grouped;
  }, [tasks]);

  // Get sections that have tasks (keep order of first appearance)
  const activeSections = useMemo(() => {
    const seen: string[] = [];
    tasks.forEach(task => {
      const section = task.section || 'NEW SECTION';
      if (!seen.includes(section)) {
        seen.push(section);
      }
    });
    return seen;
  }, [tasks]);

  const handleSave = async () => {
    if (!canEdit) return;
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (tasks.length === 0) {
      toast.error('Please add at least one task');
      return;
    }
    if (!tasks.every(t => t.title.trim() && t.section)) {
      toast.error('All tasks must have a title and section');
      return;
    }
    if (documents.length > 0 && !documents.every(d => d.title.trim())) {
      toast.error('All documents must have a title');
      return;
    }

    setIsSaving(true);
    try {
      if (isNewTemplate) {
        const result = await createTemplate.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          stage,
          tasks: tasks.filter(t => t.title.trim()),
          documents: documents.filter(d => d.title.trim()) as any,
          is_default: isDefault,
          team_id: profile?.primary_team_id || undefined,
        });
        toast.success('Template created successfully');
        navigate('/transaction-templates');
      } else if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          updates: {
            name: name.trim(),
            description: description.trim() || undefined,
            stage,
            tasks: tasks.filter(t => t.title.trim()),
            documents: documents.filter(d => d.title.trim()) as any,
          },
        });

        if (isDefault !== template.is_default && !isSystemTemplate) {
          await setTemplateAsDefault.mutateAsync({
            templateId: template.id,
            stage,
            makeDefault: isDefault,
          });
        }
        
        toast.success('Template saved successfully');
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const addTask = (section?: string) => {
    const newTask: TransactionTask = {
      title: '',
      section: section || 'GETTING STARTED',
      description: '',
      due_offset_days: undefined,
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (originalIndex: number, updates: Partial<TransactionTask>) => {
    const updated = [...tasks];
    updated[originalIndex] = { ...updated[originalIndex], ...updates };
    setTasks(updated);
  };

  const removeTask = (originalIndex: number) => {
    setTasks(tasks.filter((_, i) => i !== originalIndex));
  };

  const addSection = () => {
    const existingCount = activeSections.length;
    const newSectionName = `SECTION ${existingCount + 1}`;
    const newTask: TransactionTask = {
      title: '',
      section: newSectionName,
      description: '',
      due_offset_days: undefined,
    };
    setTasks([...tasks, newTask]);
  };

  const renameSection = (oldName: string, newName: string) => {
    // Check if new name already exists
    if (activeSections.includes(newName) && oldName !== newName) {
      toast.error('A section with this name already exists');
      return;
    }
    setTasks(tasks.map(t => 
      t.section === oldName ? { ...t, section: newName } : t
    ));
  };

  const deleteSection = (section: string) => {
    // Only delete if section is empty
    const sectionTasks = tasks.filter(t => t.section === section);
    if (sectionTasks.length === 0) {
      // Remove any empty tasks that might have been created for this section
      setTasks(tasks.filter(t => t.section !== section));
    }
  };

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const element = document.getElementById(`section-${section.replace(/\s/g, '-')}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        navigate('/transaction-templates');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, navigate]);

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage={isNewTemplate ? 'New Template' : template?.name || 'Edit Template'} />
      
      {/* Info Bar */}
      <div className="border-b bg-card px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/transaction-templates')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name..."
                className="text-lg font-semibold h-10 w-[300px] border-transparent hover:border-input focus:border-input"
                disabled={!canEdit}
              />
              {isSystemTemplate && (
                <Badge variant="secondary">System Template</Badge>
              )}
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Unsaved changes
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              value={stage} 
              onValueChange={(v) => setStage(v as TransactionStage)}
              disabled={!canEdit || (!isNewTemplate && isSystemTemplate)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!isSystemTemplate && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30">
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={!canEdit}
                  className="scale-90"
                />
                <span className="text-sm">Default</span>
              </div>
            )}
            
            <Button 
              onClick={handleSave}
              disabled={!canEdit || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      {!canEdit && (
        <Alert className="mx-6 mt-4 max-w-[1800px]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            System templates can only be edited by platform administrators.
            Duplicate this template to create your own version.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <TemplateSidebar
          sections={activeSections}
          tasksBySection={tasksBySection}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
          documentsCount={documents.length}
          totalTasks={tasks.length}
        />

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="tasks" className="h-full flex flex-col">
            <div className="px-6 pt-4 border-b bg-background">
              <TabsList>
                <TabsTrigger value="tasks">
                  Tasks ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="documents">
                  Documents ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="settings">
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tasks" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Quick Add */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{tasks.length} tasks</Badge>
                      <span className="text-sm text-muted-foreground">
                        across {activeSections.length} sections
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => addTask()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>

                  {/* Tasks by Section */}
                  {activeSections.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground mb-4">No tasks yet</p>
                      <Button onClick={() => addTask()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Task
                      </Button>
                    </div>
                  ) : (
                    activeSections.map((section, idx) => (
                      <CollapsibleTaskSection
                        key={section}
                        section={section}
                        sectionIndex={idx}
                        tasks={tasksBySection[section] || []}
                        onUpdateTask={updateTask}
                        onRemoveTask={removeTask}
                        onAddTask={() => addTask(section)}
                        onRenameSection={renameSection}
                        onDeleteSection={deleteSection}
                        teamMembers={teamMembers}
                        isDefaultTemplate={isSystemTemplate}
                        disabled={!canEdit}
                      />
                    ))
                  )}

                  {/* Add Section Button */}
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={addSection} disabled={!canEdit}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="documents" className="flex-1 overflow-auto mt-0 p-6">
              <DocumentBuilder 
                documents={documents} 
                onDocumentsChange={setDocuments}
              />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto mt-0 p-6">
              <div className="max-w-2xl space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this template is used for..."
                    rows={4}
                    disabled={!canEdit}
                  />
                  <p className="text-sm text-muted-foreground">
                    A brief description to help identify this template's purpose.
                  </p>
                </div>

                {isSystemTemplate && !isNewTemplate && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This is a system template. The lifecycle stage cannot be changed.
                      {!isPlatformAdmin && ' Only platform administrators can edit system templates.'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

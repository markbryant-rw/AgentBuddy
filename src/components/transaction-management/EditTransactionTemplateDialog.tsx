import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionTaskBuilder, TransactionTask } from './TransactionTaskBuilder';
import { DocumentBuilder, TransactionDocument } from './DocumentBuilder';
import { useTransactionTemplates, TransactionTemplate, TransactionStage } from '@/hooks/useTransactionTemplates';
import { useProfile } from '@/hooks/useProfile';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EditTransactionTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TransactionTemplate | null;
  mode?: 'edit' | 'create';
  initialStage?: TransactionStage;
}

const stageLabels: Record<TransactionStage, string> = {
  signed: 'Signed',
  live: 'Live',
  contract: 'Under Contract',
  unconditional: 'Unconditional',
  settled: 'Settled',
  open_homes: 'Open Homes',
  property_documents: 'Property Documents',
};

export function EditTransactionTemplateDialog({
  open,
  onOpenChange,
  template,
  mode = 'edit',
  initialStage = 'signed',
}: EditTransactionTemplateDialogProps) {
  const { profile } = useProfile();
  const { createTemplate, updateTemplate, setTemplateAsDefault } = useTransactionTemplates();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<TransactionStage>(initialStage);
  const [tasks, setTasks] = useState<TransactionTask[]>([]);
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  const isSystemTemplate = template?.is_system_template || false;
  const isPlatformAdmin = profile?.user_type === 'admin_staff';
  const canEdit = mode === 'create' || !isSystemTemplate || isPlatformAdmin;

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

  useEffect(() => {
    if (template && mode === 'edit') {
      setName(template.name);
      setDescription(template.description || '');
      setStage(template.stage);
      setTasks(template.tasks || []);
      setDocuments(template.documents || []);
      setIsDefault(template.is_default);
    } else if (mode === 'create') {
      setName('');
      setDescription('');
      setStage(initialStage);
      setTasks([]);
      setDocuments([]);
      setIsDefault(false);
    }
  }, [template, mode, initialStage, open]);

  const handleSubmit = async () => {
    if (!canEdit) return;

    // Validation
    if (!name.trim()) {
      return;
    }

    if (tasks.length === 0) {
      return;
    }

    if (!tasks.every(t => t.title.trim() && t.section)) {
      return;
    }

    if (documents.length > 0 && !documents.every(d => d.title.trim() && d.section)) {
      return;
    }

    try {
      if (mode === 'create') {
        await createTemplate.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          stage,
          tasks: tasks.filter(t => t.title.trim()),
          documents: documents.filter(d => d.title.trim()),
          is_default: isDefault,
          team_id: profile?.primary_team_id || undefined,
        });
      } else if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          updates: {
            name: name.trim(),
            description: description.trim() || undefined,
            stage,
            tasks: tasks.filter(t => t.title.trim()),
            documents: documents.filter(d => d.title.trim()),
          },
        });

        // Handle default toggle separately if changed
        if (isDefault !== template.is_default && !isSystemTemplate) {
          await setTemplateAsDefault.mutateAsync({
            templateId: template.id,
            stage,
            makeDefault: isDefault,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const isValid = name.trim() && 
                  tasks.length > 0 && 
                  tasks.every(t => t.title.trim() && t.section) &&
                  (documents.length === 0 || documents.every(d => d.title.trim() && d.section));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Template' : 'Edit Template'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a custom template with tasks and documents'
              : isSystemTemplate
                ? isPlatformAdmin 
                  ? 'Editing system template (Platform Admin)'
                  : 'Viewing system template (read-only)'
                : 'Edit your custom template'
            }
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System templates can only be edited by platform administrators.
              You can duplicate this template to create your own version.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tasks" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4">
            <TabsTrigger value="information">
              Information
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks {tasks.length > 0 && `(${tasks.length})`}
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents {documents.length > 0 && `(${documents.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="flex-1 overflow-y-auto px-4 space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., My Custom Signed Template"
                    disabled={!canEdit}
                  />
                </div>

                {isSystemTemplate && (
                  <Badge variant="secondary" className="mt-7">
                    System Template
                  </Badge>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this template is used for..."
                  rows={3}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="stage">Lifecycle Stage *</Label>
                  <Select 
                    value={stage} 
                    onValueChange={(v) => setStage(v as TransactionStage)}
                    disabled={!canEdit || (mode === 'edit' && isSystemTemplate)}
                  >
                    <SelectTrigger id="stage">
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
                  {mode === 'edit' && isSystemTemplate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      System template stage cannot be changed
                    </p>
                  )}
                </div>

                {!isSystemTemplate && mode === 'edit' && (
                  <div className="flex items-center gap-3 mt-7">
                    <Switch
                      id="is-default"
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                      disabled={!canEdit}
                    />
                    <Label htmlFor="is-default" className="cursor-pointer">
                      Set as default template for this stage
                    </Label>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-hidden px-4 mt-4">
            <TransactionTaskBuilder 
              tasks={tasks} 
              onTasksChange={setTasks}
              teamMembers={teamMembers}
              isDefaultTemplate={isSystemTemplate}
            />
          </TabsContent>

          <TabsContent value="documents" className="flex-1 overflow-y-auto px-4 space-y-4 mt-4">
            <DocumentBuilder 
              documents={documents} 
              onDocumentsChange={setDocuments}
            />
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {!isValid && (
              <span className="text-destructive">
                * Please complete all required fields
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!canEdit || !isValid || createTemplate.isPending || updateTemplate.isPending}
            >
              {mode === 'create' ? 'Create Template' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ListChecks, 
  Mail, 
  MessageSquare, 
  FileText, 
  Plus, 
  Search,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { TemplateCard } from './TemplateCard';
import { CommunicationTemplateEditor } from './CommunicationTemplateEditor';
import { useCommunicationTemplates, CommunicationTemplate } from '@/hooks/useCommunicationTemplates';
import { useNoteTemplatesReal, NoteTemplate } from '@/hooks/useNoteTemplatesReal';
import { useAppraisalTemplates } from '@/hooks/useAppraisalTemplates';
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates';
import { useAftercareTemplates } from '@/hooks/useAftercareTemplates';
import { toast } from 'sonner';

const categories = [
  { id: 'task', label: 'Task Templates', icon: ListChecks, description: 'Appraisal, Transaction, Aftercare' },
  { id: 'email', label: 'Email Templates', icon: Mail, description: 'Anniversary, Follow-up, Custom' },
  { id: 'sms', label: 'SMS Templates', icon: MessageSquare, description: 'Reminders, Check-ins' },
  { id: 'note', label: 'Note Templates', icon: FileText, description: 'Meeting, Property Notes' },
];

export function PlaybookStudioTab() {
  const [activeCategory, setActiveCategory] = useState('task');
  const [searchQuery, setSearchQuery] = useState('');
  const [emailEditorOpen, setEmailEditorOpen] = useState(false);
  const [smsEditorOpen, setSmsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [editorType, setEditorType] = useState<'email' | 'sms' | 'anniversary_email'>('email');

  // Hooks for different template types
  const { templates: emailTemplates, createTemplate: createEmail, updateTemplate: updateEmail, deleteTemplate: deleteEmail, duplicateTemplate: duplicateEmail } = useCommunicationTemplates('email');
  const { templates: anniversaryTemplates, duplicateTemplate: duplicateAnniversary } = useCommunicationTemplates('anniversary_email');
  const { templates: smsTemplates, createTemplate: createSms, updateTemplate: updateSms, deleteTemplate: deleteSms, duplicateTemplate: duplicateSms } = useCommunicationTemplates('sms');
  const { templates: noteTemplates, deleteTemplate: deleteNote, duplicateTemplate: duplicateNote } = useNoteTemplatesReal();
  const { templates: appraisalTemplates } = useAppraisalTemplates();
  const { templates: transactionTemplates } = useTransactionTemplates();
  const { templates: aftercareTemplates } = useAftercareTemplates();

  const allEmailTemplates = [...anniversaryTemplates, ...emailTemplates];

  const handleNewEmail = () => {
    setEditingTemplate(null);
    setEditorType('email');
    setEmailEditorOpen(true);
  };

  const handleNewSms = () => {
    setEditingTemplate(null);
    setEditorType('sms');
    setSmsEditorOpen(true);
  };

  const handleEditEmail = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setEditorType(template.type as 'email' | 'anniversary_email');
    setEmailEditorOpen(true);
  };

  const handleEditSms = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setEditorType('sms');
    setSmsEditorOpen(true);
  };

  const handleSaveEmail = async (data: Partial<CommunicationTemplate>) => {
    try {
      if (editingTemplate) {
        await updateEmail({ id: editingTemplate.id, updates: data });
      } else {
        await createEmail({
          ...data,
          type: 'email',
          scope: 'team',
          is_system_template: false,
          is_default: false,
          variables: [],
          agency_id: null,
          team_id: null,
          user_id: null,
          created_by: null,
        } as any);
      }
      setEmailEditorOpen(false);
    } catch (error) {
      console.error('Failed to save email template:', error);
    }
  };

  const handleSaveSms = async (data: Partial<CommunicationTemplate>) => {
    try {
      if (editingTemplate) {
        await updateSms({ id: editingTemplate.id, updates: data });
      } else {
        await createSms({
          ...data,
          type: 'sms',
          scope: 'team',
          is_system_template: false,
          is_default: false,
          variables: [],
          agency_id: null,
          team_id: null,
          user_id: null,
          created_by: null,
        } as any);
      }
      setSmsEditorOpen(false);
    } catch (error) {
      console.error('Failed to save SMS template:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Playbook Studio
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" />
                Beta
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Create and manage all your templates in one place
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[250px]"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
              <cat.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Task Templates */}
        <TabsContent value="task" className="space-y-6 mt-6">
          {/* Appraisal Templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Appraisal Templates</CardTitle>
                  <CardDescription>VAP, MAP, LAP stage task templates</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info('Open appraisal template builder')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {appraisalTemplates.filter(t => 
                  !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    type="task"
                    scope={template.is_system_template ? 'platform' : 'team'}
                    isSystem={template.is_system_template || false}
                    isDefault={template.is_default || false}
                    stage={template.stage}
                    onEdit={() => toast.info('Edit in appraisal template builder')}
                    onDuplicate={() => toast.info('Duplicate template')}
                    onDelete={() => toast.info('Delete template')}
                  />
                ))}
                {appraisalTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No appraisal templates yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Transaction Templates</CardTitle>
                  <CardDescription>Signed, Live, Contract, Unconditional, Settled</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info('Open transaction template builder')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {transactionTemplates.filter(t => 
                  !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    type="task"
                    scope={template.is_system_template ? 'platform' : 'team'}
                    isSystem={template.is_system_template || false}
                    isDefault={template.is_default || false}
                    stage={template.stage}
                    onEdit={() => toast.info('Edit in transaction template builder')}
                    onDuplicate={() => toast.info('Duplicate template')}
                    onDelete={() => toast.info('Delete template')}
                  />
                ))}
                {transactionTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No transaction templates yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aftercare Templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Aftercare Templates</CardTitle>
                  <CardDescription>10-year relationship nurturing plans</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info('Open aftercare template builder')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {aftercareTemplates.filter(t => 
                  !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.description}
                    type="task"
                    scope={template.is_system_template ? 'platform' : template.scope as any}
                    isSystem={template.is_system_template || false}
                    isDefault={template.is_default || false}
                    onEdit={() => toast.info('Edit in aftercare template builder')}
                    onDuplicate={() => toast.info('Duplicate template')}
                    onDelete={() => toast.info('Delete template')}
                  />
                ))}
                {aftercareTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No aftercare templates yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Email Templates</CardTitle>
                  <CardDescription>Anniversary emails, follow-ups, and custom messages</CardDescription>
                </div>
                <Button size="sm" onClick={handleNewEmail}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Email Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allEmailTemplates.filter(t => 
                  !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.subject_template}
                    type="email"
                    scope={template.scope}
                    isSystem={template.is_system_template}
                    isDefault={template.is_default}
                    stage={template.trigger_event?.replace(/_/g, ' ')}
                    onEdit={() => handleEditEmail(template)}
                    onDuplicate={() => template.type === 'anniversary_email' ? duplicateAnniversary(template.id) : duplicateEmail(template.id)}
                    onDelete={() => deleteEmail(template.id)}
                  />
                ))}
                {allEmailTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No email templates yet. System templates will appear after creation.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Templates */}
        <TabsContent value="sms" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">SMS Templates</CardTitle>
                  <CardDescription>Quick messages and appointment reminders</CardDescription>
                </div>
                <Button size="sm" onClick={handleNewSms}>
                  <Plus className="h-4 w-4 mr-1" />
                  New SMS Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {smsTemplates.filter(t => 
                  !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.name}
                    description={template.body_template?.substring(0, 100)}
                    type="sms"
                    scope={template.scope}
                    isSystem={template.is_system_template}
                    isDefault={template.is_default}
                    onEdit={() => handleEditSms(template)}
                    onDuplicate={() => duplicateSms(template.id)}
                    onDelete={() => deleteSms(template.id)}
                  />
                ))}
                {smsTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No SMS templates yet. Create your first one!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Note Templates */}
        <TabsContent value="note" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Note Templates</CardTitle>
                  <CardDescription>Meeting notes, property notes, and more</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info('Note template editor coming soon')}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Note Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {noteTemplates.filter(t => 
                  !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((template) => (
                  <TemplateCard
                    key={template.id}
                    id={template.id}
                    name={template.title}
                    description={template.description}
                    type="note"
                    scope={template.scope}
                    isSystem={template.is_system_template}
                    isDefault={template.is_default}
                    stage={template.category}
                    onEdit={() => toast.info('Note template editor coming soon')}
                    onDuplicate={() => duplicateNote(template.id)}
                    onDelete={() => deleteNote(template.id)}
                  />
                ))}
                {noteTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                    No note templates yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Editor Dialog */}
      <CommunicationTemplateEditor
        open={emailEditorOpen}
        onOpenChange={setEmailEditorOpen}
        template={editingTemplate}
        type={editorType}
        onSave={handleSaveEmail}
      />

      {/* SMS Editor Dialog */}
      <CommunicationTemplateEditor
        open={smsEditorOpen}
        onOpenChange={setSmsEditorOpen}
        template={editingTemplate}
        type="sms"
        onSave={handleSaveSms}
      />
    </div>
  );
}

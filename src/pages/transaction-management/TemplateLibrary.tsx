import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionTemplates, TransactionStage, TransactionTemplate } from '@/hooks/useTransactionTemplates';
import { useProfile } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Copy, Trash2, Star, Search, Edit, Plus, ListChecks, Files, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const stageLabels: Record<TransactionStage, string> = {
  signed: '01. Signed',
  live: '02. Live',
  contract: '03. Under Contract',
  unconditional: '04. Unconditional',
  settled: '05. Settled',
  open_homes: 'Open Homes',
  property_documents: 'Property Documents',
};

const stageColors: Record<TransactionStage, string> = {
  signed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  live: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  contract: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  unconditional: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  settled: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  open_homes: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30',
  property_documents: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30',
};

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { hasRole } = useUserRoles();
  const { templates, isLoading, deleteTemplate, createTemplate, setTemplateAsDefault } = useTransactionTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<TransactionStage | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isPlatformAdmin = hasRole('platform_admin');

  const systemTemplates = useMemo(
    () => templates.filter(t => t.is_system_template),
    [templates]
  );

  const userTemplates = useMemo(
    () => templates.filter(t => !t.is_system_template),
    [templates]
  );

  const filteredSystemTemplates = useMemo(() => {
    return systemTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || t.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [systemTemplates, searchQuery, stageFilter]);

  const filteredUserTemplates = useMemo(() => {
    return userTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || t.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [userTemplates, searchQuery, stageFilter]);

  const handleDuplicate = async (template: TransactionTemplate) => {
    if (!profile?.primary_team_id) {
      toast.error('Unable to duplicate: No team found');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: `${template.name} (Copy)`,
        description: template.description,
        stage: template.stage,
        tasks: template.tasks,
        documents: template.documents,
        is_default: false,
        team_id: profile.primary_team_id,
      });
      toast.success('Template duplicated successfully');
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const handleToggleDefault = async (template: TransactionTemplate) => {
    try {
      await setTemplateAsDefault.mutateAsync({
        templateId: template.id,
        stage: template.stage,
        makeDefault: !template.is_default,
      });
    } catch (error) {
      console.error('Error toggling default:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const TemplateCard = ({ template, isSystem }: { template: TransactionTemplate; isSystem: boolean }) => (
    <Card className="group hover:border-primary/50 transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <CardTitle className="text-lg truncate">{template.name}</CardTitle>
              {isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
              {template.is_default && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={stageColors[template.stage]}>
              {stageLabels[template.stage]}
            </Badge>
          </div>
        </div>
        {template.description && (
          <CardDescription className="line-clamp-2 mt-2">{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            <span>{template.tasks.length} tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Files className="h-4 w-4" />
            <span>{template.documents.length} documents</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          {!isSystem && (
            <div className="flex items-center gap-2">
              <Switch
                checked={template.is_default}
                onCheckedChange={() => handleToggleDefault(template)}
                className="scale-90"
              />
              <span className="text-xs text-muted-foreground">Default</span>
            </div>
          )}
          {isSystem && <div />}
          
          <div className="flex gap-2">
            {(isPlatformAdmin || !isSystem) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/transaction-templates/${template.id}`)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicate(template)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Duplicate
            </Button>
            {!isSystem && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmId(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="transact" currentPage="Template Library" />
      <div className="flex-1 overflow-auto">
        <div className="px-4 md:px-6 py-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/transaction-coordinating')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Template Library</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your transaction stage templates
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/transaction-templates/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="system" className="space-y-6">
            <TabsList>
              <TabsTrigger value="system">
                System Templates ({systemTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="custom">
                My Templates ({userTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading templates...
                </div>
              ) : filteredSystemTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No system templates found
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSystemTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} isSystem={true} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading templates...
                </div>
              ) : filteredUserTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No custom templates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your own templates or duplicate a system template to customize it for your workflow.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => navigate('/transaction-templates/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredUserTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} isSystem={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

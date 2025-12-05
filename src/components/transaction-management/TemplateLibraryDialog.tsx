import React, { useState, useMemo } from 'react';
import { useTransactionTemplates, TransactionStage, TransactionTemplate } from '@/hooks/useTransactionTemplates';
import { useProfile } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { FileText, Copy, Trash2, Star, Search, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { EditTransactionTemplateDialog } from './EditTransactionTemplateDialog';

interface TemplateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageLabels: Record<TransactionStage, string> = {
  signed: '01. Signed',
  live: '02. Live',
  contract: '03. Under Contract',
  unconditional: '04. Unconditional',
  settled: '05. Settled',
};

export function TemplateLibraryDialog({ open, onOpenChange }: TemplateLibraryDialogProps) {
  const { profile } = useProfile();
  const { hasRole } = useUserRoles();
  const { templates, isLoading, deleteTemplate, createTemplate, setTemplateAsDefault } = useTransactionTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<TransactionStage | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState<TransactionTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const handleDuplicate = async (template: any) => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
            <DialogDescription>
              Manage your transaction stage templates
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 pb-4">
            <div className="relative flex-1">
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
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <Tabs defaultValue="system" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="system">
                System Templates ({systemTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="custom">
                My Templates ({userTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="flex-1 overflow-y-auto mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading templates...
                </div>
              ) : filteredSystemTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No system templates found
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredSystemTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <Badge variant="secondary">System</Badge>
                              {template.is_default && (
                                <Badge variant="default">
                                  <Star className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{stageLabels[template.stage]}</span>
                              <span>•</span>
                              <span>{template.tasks.length} tasks</span>
                              <span>•</span>
                              <span>{template.documents.length} documents</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isPlatformAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditTemplate(template)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicate(template)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </Button>
                          </div>
                        </div>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Tasks</h4>
                            <div className="space-y-1">
                              {template.tasks.slice(0, 5).map((task: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{task.title}</span>
                                </div>
                              ))}
                              {template.tasks.length > 5 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{template.tasks.length - 5} more...
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Documents</h4>
                            <div className="space-y-1">
                              {template.documents.slice(0, 5).map((doc: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">
                                    {doc.title}
                                    {doc.required && <span className="text-destructive ml-1">*</span>}
                                  </span>
                                </div>
                              ))}
                              {template.documents.length > 5 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{template.documents.length - 5} more...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="flex-1 overflow-y-auto mt-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading templates...
                </div>
              ) : filteredUserTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">No custom templates yet</p>
                  <p className="text-sm">
                    Duplicate a system template to create your own custom version
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredUserTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              {template.is_default && (
                                <Badge variant="default">
                                  <Star className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{stageLabels[template.stage]}</span>
                              <span>•</span>
                              <span>{template.tasks.length} tasks</span>
                              <span>•</span>
                              <span>{template.documents.length} documents</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex items-center gap-2 mr-2">
                              <Switch
                                checked={template.is_default}
                                onCheckedChange={() => handleToggleDefault(template)}
                              />
                              <span className="text-sm text-muted-foreground">Default</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicate(template)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteConfirmId(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Tasks</h4>
                            <div className="space-y-1">
                              {template.tasks.slice(0, 5).map((task: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{task.title}</span>
                                </div>
                              ))}
                              {template.tasks.length > 5 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{template.tasks.length - 5} more...
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Documents</h4>
                            <div className="space-y-1">
                              {template.documents.slice(0, 5).map((doc: any, idx: number) => (
                                <div key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">
                                    {doc.title}
                                    {doc.required && <span className="text-destructive ml-1">*</span>}
                                  </span>
                                </div>
                              ))}
                              {template.documents.length > 5 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{template.documents.length - 5} more...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <EditTransactionTemplateDialog
        open={!!editTemplate || showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setEditTemplate(null);
            setShowCreateDialog(false);
          }
        }}
        template={editTemplate}
        mode={editTemplate ? 'edit' : 'create'}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
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
    </>
  );
}
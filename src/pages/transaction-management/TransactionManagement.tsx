import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { CheckSquare, Plus, Archive } from 'lucide-react';
import { useProjectTemplates } from '@/hooks/useProjectTemplates';
import { TemplateCard } from './components/TemplateCard';
import { CreateTemplateDialog } from './components/CreateTemplateDialog';
import { EditTemplateDialog } from './components/EditTemplateDialog';
import { TemplateDetailDialog } from './components/TemplateDetailDialog';
import { TemplateAnalytics } from './components/TemplateAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TransactionManagement = () => {
  const { hasAnyRole } = useAuth();
  const { templates, isLoading } = useProjectTemplates();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>('all');

  const filteredTemplates = templates.filter(template => {
    if (!showArchived && template.is_archived) return false;
    if (stageFilter !== 'all' && template.lifecycle_stage !== stageFilter) return false;
    return true;
  });

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setEditDialogOpen(true);
  };

  const handleView = (template: any) => {
    setSelectedTemplate(template);
    setDetailDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        icon={CheckSquare}
        title="Project Templates Library"
        description="Manage reusable task lists for automated project generation"
        category="systems"
        actions={
          hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) ? (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Filter Bar */}
          <div className="flex items-center gap-6 p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-4">
              <Label>Stage:</Label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 rounded-md border bg-background"
              >
                <option value="all">All Stages</option>
                <option value="lead">Lead</option>
                <option value="live">Live</option>
                <option value="contract">Under Contract</option>
                <option value="unconditional">Unconditional</option>
                <option value="settled">Settled</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="show-archived" className="flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Show Archived
              </Label>
            </div>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CheckSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground mb-6">
                {showArchived 
                  ? "No archived templates to display."
                  : "Create your first template to automate project creation."}
              </p>
              {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && !showArchived && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onView={handleView}
                  isAdmin={hasAnyRole(['platform_admin', 'office_manager', 'team_leader'])}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <TemplateAnalytics />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      {selectedTemplate && (
        <>
          <EditTemplateDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            template={selectedTemplate}
          />
          <TemplateDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            template={selectedTemplate}
            onEdit={() => {
              setDetailDialogOpen(false);
              setEditDialogOpen(true);
            }}
          />
        </>
      )}
    </div>
  );
};

export default TransactionManagement;

import { useState } from 'react';
import { useNoteTemplates, NoteTemplate } from '@/hooks/useNoteTemplates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Trash2, Archive, TrendingUp, Search } from 'lucide-react';
import { TemplatePreviewDialog } from '@/components/notes/TemplatePreviewDialog';
import { EditTemplateDialog } from '@/components/notes/EditTemplateDialog';
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
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS: Record<string, string> = {
  events: '🎤',
  meetings: '📅',
  listings: '🏠',
  vendors: '🤝',
  personal: '📝',
  general: '📄',
};

export default function TemplateManager() {
  const { templates, deleteTemplate, archiveTemplate } = useNoteTemplates();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<NoteTemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState<NoteTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NoteTemplate | null>(null);

  const filteredTemplates = templates.filter(
    (t) =>
      !t.archived_at &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const systemTemplates = filteredTemplates.filter((t) => t.is_system);
  const teamTemplates = filteredTemplates.filter((t) => !t.is_system && t.team_id);
  const myTemplates = filteredTemplates.filter(
    (t) => !t.is_system && !t.team_id && t.created_by === user?.id
  );

  const handleUseTemplate = (template: NoteTemplate) => {
    // Navigate to create new note with template
    navigate('/notes/new', { state: { template } });
  };

  const handleDelete = async () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleArchive = (template: NoteTemplate) => {
    archiveTemplate.mutate(template.id);
  };

  const renderTemplateCard = (template: NoteTemplate, canEdit: boolean, canDelete: boolean) => (
    <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{CATEGORY_ICONS[template.category] || '📄'}</span>
            <div className="flex-1">
              <h3 className="font-semibold">{template.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{template.category}</Badge>
          {template.is_system && <Badge variant="outline">System</Badge>}
          {template.usage_count && template.usage_count > 0 && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              {template.usage_count}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewTemplate(template)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => handleUseTemplate(template)}
            className="flex-1"
          >
            Use Template
          </Button>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditTemplate(template)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {canDelete && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleArchive(template)}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setTemplateToDelete(template);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Template Manager</h1>
          <p className="text-muted-foreground">Create, edit, and manage your note templates</p>
        </div>
        <Button onClick={() => navigate('/notes')}>Back to Notes</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList>
          <TabsTrigger value="system">
            System Templates ({systemTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="team">
            Team Templates ({teamTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="my">
            My Templates ({myTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          {systemTemplates.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No system templates found
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemTemplates.map((template) =>
                renderTemplateCard(template, false, false)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {teamTemplates.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No team templates yet
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamTemplates.map((template) =>
                renderTemplateCard(template, true, false)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-4">
          {myTemplates.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <p className="mb-4">You haven't created any templates yet</p>
              <Button onClick={() => navigate('/notes')}>
                Create Your First Template
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTemplates.map((template) =>
                renderTemplateCard(template, true, true)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplatePreviewDialog
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        template={previewTemplate}
        onUse={handleUseTemplate}
      />

      <EditTemplateDialog
        open={!!editTemplate}
        onOpenChange={(open) => !open && setEditTemplate(null)}
        template={editTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { 
  Plus, 
  Star, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2,
  ListTodo,
  Search,
  Globe,
  User,
} from 'lucide-react';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGES } from '@/hooks/useAppraisalTemplates';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { toast } from 'sonner';

const STAGE_COLORS: Record<AppraisalStage, string> = {
  'VAP': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'MAP': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'LAP': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

const AppraisalTemplateLibrary = () => {
  const navigate = useNavigate();
  const { templates, isLoading, deleteTemplate, duplicateTemplate, setAsDefault } = useAppraisalTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<AppraisalStage | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = stageFilter === 'all' || t.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Separate system and user templates
  const systemTemplates = filteredTemplates.filter(t => t.is_system_template);
  const userTemplates = filteredTemplates.filter(t => !t.is_system_template);

  const handleDelete = async () => {
    if (templateToDelete) {
      const template = templates.find(t => t.id === templateToDelete);
      if (template?.is_system_template) {
        toast.error('System templates cannot be deleted');
        setDeleteDialogOpen(false);
        return;
      }
      await deleteTemplate.mutateAsync(templateToDelete);
      setTemplateToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const confirmDelete = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.is_system_template) {
      toast.error('System templates cannot be deleted');
      return;
    }
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = async (templateId: string) => {
    await duplicateTemplate.mutateAsync(templateId);
  };

  const handleSetDefault = async (templateId: string, stage: AppraisalStage) => {
    await setAsDefault.mutateAsync({ templateId, stage });
  };

  const renderTemplateCard = (template: typeof templates[0]) => (
    <Card 
      key={template.id} 
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => !template.is_system_template && navigate(`/appraisal-templates/${template.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={STAGE_COLORS[template.stage]}>
                {template.stage}
              </Badge>
              <StageInfoTooltip stage={template.stage} />
              {template.is_system_template ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 gap-1">
                  <Globe className="h-3 w-3" />
                  System
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                  <User className="h-3 w-3" />
                  Custom
                </Badge>
              )}
              {template.is_default && !template.is_system_template && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
              )}
            </div>
            <CardTitle className="text-base truncate">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {template.description || 'No description'}
            </CardDescription>
            {template.is_system_template && (
              <p className="text-xs text-muted-foreground italic">
                Duplicate to customize for your team
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!template.is_system_template && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/appraisal-templates/${template.id}`);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(template.id);
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate to My Templates
              </DropdownMenuItem>
              {!template.is_system_template && (
                <>
                  {!template.is_default && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(template.id, template.stage);
                    }}>
                      <Star className="h-4 w-4 mr-2" />
                      Set as Default
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(template.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span>{template.tasks.length} tasks</span>
          </div>
          {!template.is_system_template && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-muted-foreground">Default</span>
              <Switch 
                checked={template.is_default}
                onCheckedChange={() => {
                  if (!template.is_default) {
                    handleSetDefault(template.id, template.stage);
                  }
                }}
                disabled={template.is_default}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen">
      <WorkspaceHeader workspace="prospect" currentPage="Appraisal Templates" backTo="/prospect-dashboard/appraisals" backLabel="Appraisals" />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Template Library</h1>
            <p className="text-muted-foreground">Manage your appraisal stage templates</p>
          </div>
          <Button onClick={() => navigate('/appraisal-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
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

        {/* Template Count */}
        <div className="text-sm text-muted-foreground">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} 
          ({systemTemplates.length} system, {userTemplates.length} custom)
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
              <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || stageFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first template to streamline appraisal tasks'}
              </p>
              <Button onClick={() => navigate('/appraisal-templates/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* System Templates Section */}
            {systemTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">System Templates</h2>
                  <span className="text-sm text-muted-foreground">
                    (provided by platform)
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {systemTemplates.map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* User Templates Section */}
            {userTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-semibold">My Templates</h2>
                  <span className="text-sm text-muted-foreground">
                    (custom for your team)
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userTemplates.map(renderTemplateCard)}
                </div>
              </div>
            )}

            {/* Empty user templates message */}
            {userTemplates.length === 0 && systemTemplates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-semibold">My Templates</h2>
                </div>
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      No custom templates yet. Duplicate a system template or create your own.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/appraisal-templates/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Template
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppraisalTemplateLibrary;

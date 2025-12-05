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
  ArrowLeft,
  Search,
} from 'lucide-react';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGES, APPRAISAL_STAGE_DISPLAY_NAMES, APPRAISAL_STAGE_DESCRIPTIONS } from '@/hooks/useAppraisalTemplates';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const STAGE_COLORS: Record<AppraisalStage, string> = {
  'VAP': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'MAP': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  'LAP': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

const AppraisalTemplateLibrary = () => {
  const navigate = useNavigate();
  const { templates, isLoading, deleteTemplate, setAsDefault } = useAppraisalTemplates();
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

  const handleDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete);
      setTemplateToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const confirmDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = (template: typeof templates[0]) => {
    navigate(`/appraisal-templates/new`, { 
      state: { duplicate: template } 
    });
  };

  const handleSetDefault = async (templateId: string, stage: AppraisalStage) => {
    await setAsDefault.mutateAsync({ templateId, stage });
  };

  return (
    <div className="min-h-screen">
      <WorkspaceHeader workspace="prospect" currentPage="Appraisal Templates" />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/prospect-appraisals')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Template Library</h1>
              <p className="text-muted-foreground">Manage your appraisal stage templates</p>
            </div>
          </div>
          <Button onClick={() => navigate('/appraisal-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/appraisal-templates/${template.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={STAGE_COLORS[template.stage]}>
                          {template.stage}
                        </Badge>
                        <StageInfoTooltip stage={template.stage} />
                        {template.is_default && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description || 'No description'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/appraisal-templates/${template.id}`);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(template);
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!template.is_default && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(template.id, template.stage);
                          }}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
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
                  </div>
                </CardContent>
              </Card>
            ))}
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

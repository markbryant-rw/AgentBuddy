import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Star, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2,
  ListTodo,
} from 'lucide-react';
import { useAppraisalTemplates, AppraisalStage, APPRAISAL_STAGES, APPRAISAL_STAGE_DISPLAY_NAMES } from '@/hooks/useAppraisalTemplates';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

const AppraisalTemplateLibrary = () => {
  const navigate = useNavigate();
  const { templates, isLoading, deleteTemplate, setAsDefault } = useAppraisalTemplates();
  const [activeTab, setActiveTab] = useState<AppraisalStage>('VAP');

  const filteredTemplates = templates.filter(t => t.stage === activeTab);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(id);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Appraisal Task Templates</h1>
            <p className="text-muted-foreground">Create and manage task templates for VAP, MAP, and LAP stages</p>
          </div>
          <Button onClick={() => navigate('/appraisal-templates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AppraisalStage)}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            {APPRAISAL_STAGES.map((stage) => (
              <TabsTrigger key={stage} value={stage}>
                {stage}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {templates.filter(t => t.stage === stage).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {APPRAISAL_STAGES.map((stage) => (
            <TabsContent key={stage} value={stage} className="mt-6">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading templates...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No {stage} Templates Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first template to streamline {APPRAISAL_STAGE_DISPLAY_NAMES[stage]} tasks.
                    </p>
                    <Button onClick={() => navigate('/appraisal-templates/new', { state: { stage } })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create {stage} Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/appraisal-templates/${template.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base truncate">{template.name}</CardTitle>
                              {template.is_default && (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <CardDescription className="mt-1 line-clamp-2">
                              {template.description || 'No description'}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                  handleDelete(template.id);
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
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ListTodo className="h-4 w-4" />
                            <span>{template.tasks.length} tasks</span>
                          </div>
                          <Badge variant="outline">{template.stage}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default AppraisalTemplateLibrary;

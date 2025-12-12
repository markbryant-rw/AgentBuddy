import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeaderWithBack } from "@/components/PageHeaderWithBack";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Globe, Edit2, Save, FileText, CheckCircle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { TemplateBuilder } from "@/pages/transaction-management/components/TemplateBuilder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Task {
  title: string;
  section?: string;
  description?: string;
  due_offset_days?: number;
  assigned_to_role?: string;
  priority?: string;
}

interface Document {
  title: string;
  section: string;
  required: boolean;
}

interface SystemTemplate {
  id: string;
  stage: string;
  name: string;
  description?: string;
  tasks: Task[];
  documents: Document[];
  is_system_template: boolean;
  created_at: string;
  updated_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  signed: "Signed",
  live: "Live",
  contract: "Under Contract",
  unconditional: "Unconditional",
  settled: "Settled",
};

const STAGE_DESCRIPTIONS: Record<string, string> = {
  signed: "Listing agreement has been signed with the vendor",
  live: "Property is live on market and being marketed",
  contract: "Property is under contract with a buyer",
  unconditional: "Sale is unconditional, awaiting settlement",
  settled: "Settlement completed, transaction finalized",
};

export default function SystemTransactionTemplates() {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<SystemTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    tasks: [] as Task[],
    documents: [] as Document[],
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["system-transaction-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_stage_templates" as any)
        .select("*")
        .eq("is_system_template", true)
        .order("stage", { ascending: true });

      if (error) throw error;
      return data as unknown as SystemTemplate[];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SystemTemplate> }) => {
      const { data, error } = await supabase
        .from("transaction_stage_templates" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-transaction-templates"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-templates"] });
      toast.success("System template updated");
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    },
  });

  const handleEdit = (template: SystemTemplate) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description || "",
      tasks: template.tasks || [],
      documents: template.documents || [],
    });
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    
    updateTemplate.mutate({
      id: editingTemplate.id,
      updates: {
        name: editForm.name,
        description: editForm.description,
        tasks: editForm.tasks,
        documents: editForm.documents,
      },
    });
  };

  const getTemplateForStage = (stage: string) => {
    return templates.find(t => t.stage === stage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <PageHeaderWithBack
        title="System Transaction Templates"
        description="Manage default transaction stage templates that apply to all teams"
        backPath="/platform-admin"
      />

      <div className="mt-6 space-y-4">
        <Card className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">About System Templates</p>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  System templates are the default templates used when a team hasn't created their own.
                  Teams can duplicate these to create custom versions. Changes here affect all teams using system defaults.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {Object.keys(STAGE_LABELS).map((stage) => {
            const template = getTemplateForStage(stage);
            
            return (
              <Card key={stage} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <Globe className="h-3 w-3 mr-1" />
                        System
                      </Badge>
                      <div>
                        <CardTitle className="text-lg">{STAGE_LABELS[stage]}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{STAGE_DESCRIPTIONS[stage]}</span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p>{STAGE_DESCRIPTIONS[stage]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </CardDescription>
                      </div>
                    </div>
                    {template && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Template
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                {template && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>{template.tasks?.length || 0} tasks</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>{template.documents?.length || 0} documents</span>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-3 italic">
                        "{template.description}"
                      </p>
                    )}
                  </CardContent>
                )}
                
                {!template && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground italic">
                      No system template configured for this stage
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Globe className="h-3 w-3 mr-1" />
                System
              </Badge>
              Edit {editingTemplate?.stage && STAGE_LABELS[editingTemplate.stage]} Template
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({editForm.tasks.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({editForm.documents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Live Stage Tasks"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template is for..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <TemplateBuilder
                tasks={editForm.tasks.map(t => ({
                  title: t.title,
                  description: t.description,
                  priority: t.priority || 'medium',
                  due_offset_days: t.due_offset_days,
                }))}
                onTasksChange={(tasks) => setEditForm(prev => ({
                  ...prev,
                  tasks: tasks.map(t => ({
                    title: t.title,
                    description: t.description,
                    section: 'General',
                    priority: t.priority,
                    due_offset_days: t.due_offset_days,
                  })),
                }))}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <div className="space-y-3">
                {editForm.documents.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <Input
                        value={doc.title}
                        onChange={(e) => {
                          const newDocs = [...editForm.documents];
                          newDocs[index] = { ...doc, title: e.target.value };
                          setEditForm(prev => ({ ...prev, documents: newDocs }));
                        }}
                        placeholder="Document title"
                        className="mb-2"
                      />
                      <div className="flex items-center gap-4 text-sm">
                        <Input
                          value={doc.section}
                          onChange={(e) => {
                            const newDocs = [...editForm.documents];
                            newDocs[index] = { ...doc, section: e.target.value };
                            setEditForm(prev => ({ ...prev, documents: newDocs }));
                          }}
                          placeholder="Section"
                          className="w-32"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={doc.required}
                            onChange={(e) => {
                              const newDocs = [...editForm.documents];
                              newDocs[index] = { ...doc, required: e.target.checked };
                              setEditForm(prev => ({ ...prev, documents: newDocs }));
                            }}
                            className="rounded"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDocs = editForm.documents.filter((_, i) => i !== index);
                        setEditForm(prev => ({ ...prev, documents: newDocs }));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditForm(prev => ({
                      ...prev,
                      documents: [...prev.documents, { title: "", section: "General", required: false }],
                    }));
                  }}
                >
                  Add Document
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Calendar, Check, Clock, Heart, Play, AlertCircle, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAftercareTasks } from "@/hooks/useAftercareTasks";
import { useAftercareTemplates } from "@/hooks/useAftercareTemplates";
import { RelationshipHealthBadge } from "./RelationshipHealthBadge";
import { AftercareTemplateSelector } from "./AftercareTemplateSelector";
import { AftercareTaskAssignee } from "@/components/tasks/AftercareTaskAssignee";
import { AftercareRefreshDialog } from "./AftercareRefreshDialog";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { PastSale } from "@/hooks/usePastSales";
import { AftercareTemplate } from "@/types/aftercare";

interface AftercarePlanTabProps {
  pastSale: PastSale;
}

export function AftercarePlanTab({ pastSale }: AftercarePlanTabProps) {
  const { user } = useAuth();
  const { team } = useTeam();
  const { tasks, isLoading, healthData, generateAftercareTasks, completeTask, toggleTask, compareWithTemplate, refreshFromTemplate } = useAftercareTasks(pastSale.id);
  const { templates, getEffectiveTemplate } = useAftercareTemplates(team?.id);
  const [expandedYear, setExpandedYear] = useState<number | null>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<AftercareTemplate | null>(null);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [refreshComparison, setRefreshComparison] = useState<ReturnType<typeof compareWithTemplate> | null>(null);

  const isAftercareActive = pastSale.aftercare_status === 'active';
  const settlementDate = pastSale.settlement_date;
  const vendorFirstName = pastSale.vendor_details?.primary?.first_name;

  // Set default template when templates load
  useState(() => {
    if (templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = getEffectiveTemplate(user?.id);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    }
  });

  const handleStartAftercare = async () => {
    if (!settlementDate || !team?.id || !user?.id) return;
    
    const template = selectedTemplate || getEffectiveTemplate(user.id);
    if (!template) return;

    await generateAftercareTasks.mutateAsync({
      pastSaleId: pastSale.id,
      template,
      settlementDate,
      teamId: team.id,
      assignedTo: pastSale.agent_id || user.id,
    });
  };

  // Group tasks by year
  const tasksByYear = tasks.reduce((acc, task) => {
    const year = task.aftercare_year ?? 0;
    if (!acc[year]) acc[year] = [];
    acc[year].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>);

  const getYearLabel = (year: number) => {
    if (year === 0) return "Settlement Week";
    if (year === 1) return "Year 1";
    if (year === 5) return "Year 5 - Milestone 🎂";
    if (year === 10) return "Year 10 - Grand Anniversary 🏆";
    return `Year ${year}`;
  };

  const getYearProgress = (yearTasks: typeof tasks) => {
    const completed = yearTasks.filter(t => t.completed).length;
    return Math.round((completed / yearTasks.length) * 100);
  };

  const handleTaskToggle = (taskId: string, currentCompleted: boolean) => {
    if (toggleTask) {
      toggleTask.mutate({ taskId, completed: !currentCompleted });
    } else if (!currentCompleted) {
      completeTask.mutate(taskId);
    }
  };

  // Get the original template used for this aftercare plan
  const originalTemplate = templates.find(t => t.id === pastSale.aftercare_template_id);

  const handleOpenRefreshDialog = () => {
    if (!originalTemplate || !settlementDate) return;
    const comparison = compareWithTemplate(originalTemplate, settlementDate);
    setRefreshComparison(comparison);
    setShowRefreshDialog(true);
  };

  const handleConfirmRefresh = (taskIdsToRemove: string[]) => {
    if (!originalTemplate || !settlementDate || !team?.id || !user?.id || !refreshComparison) return;
    
    refreshFromTemplate.mutate({
      pastSaleId: pastSale.id,
      template: originalTemplate,
      settlementDate,
      teamId: team.id,
      assignedTo: pastSale.agent_id || user.id,
      tasksToAdd: refreshComparison.adding,
      taskIdsToRemove,
    }, {
      onSuccess: () => {
        setShowRefreshDialog(false);
        setRefreshComparison(null);
      }
    });
  };

  // Show activation screen if no tasks generated yet
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="relative">
          <Heart className="h-16 w-16 text-rose-300" />
          <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <Play className="h-4 w-4 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Start Aftercare Plan</h3>
          <p className="text-muted-foreground max-w-md">
            Activate a relationship nurturing plan to stay connected with {vendorFirstName || 'your client'} through settlement follow-ups and annual anniversaries.
          </p>
        </div>

        {/* Template Selection */}
        <div className="w-full max-w-sm space-y-2">
          <label className="text-sm font-medium">Choose a template</label>
          <AftercareTemplateSelector
            templates={templates}
            selectedTemplateId={selectedTemplate?.id || null}
            onSelect={setSelectedTemplate}
            saleStatus={pastSale.status}
          />
        </div>

        <Button 
          onClick={handleStartAftercare} 
          disabled={generateAftercareTasks.isPending || !settlementDate || !selectedTemplate}
          size="lg"
          className="gap-2 bg-rose-500 hover:bg-rose-600"
        >
          <Heart className="h-4 w-4" />
          {generateAftercareTasks.isPending ? "Creating Plan..." : "Activate Aftercare Plan"}
        </Button>

        {!settlementDate && (
          <p className="text-sm text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Add a settlement date in the Property tab first
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score Header */}
      <Card className="border-none bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Relationship Health</h3>
              <p className="text-sm text-muted-foreground">
                {healthData.completedTasks} of {healthData.totalTasks} touchpoints completed
              </p>
            </div>
            <div className="flex items-center gap-3">
              {originalTemplate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenRefreshDialog}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Update plan from "{originalTemplate.name}" template</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <RelationshipHealthBadge healthData={healthData} showLabel size="lg" />
            </div>
          </div>
          <Progress value={healthData.healthScore} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        {Object.entries(tasksByYear)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([year, yearTasks]) => {
            const yearNum = Number(year);
            const isExpanded = expandedYear === yearNum;
            const progress = getYearProgress(yearTasks);
            const allComplete = progress === 100;

            return (
              <Card 
                key={year} 
                className={cn(
                  "cursor-pointer transition-all",
                  isExpanded && "ring-2 ring-primary/20",
                  allComplete && "bg-emerald-50 dark:bg-emerald-950/20"
                )}
                onClick={() => setExpandedYear(isExpanded ? null : yearNum)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Expand indicator */}
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        allComplete ? "bg-emerald-500" : "bg-primary/10"
                      )}>
                        {allComplete ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <Calendar className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{getYearLabel(yearNum)}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {yearTasks.filter(t => t.completed).length}/{yearTasks.length} tasks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={allComplete ? "default" : "secondary"}>
                        {progress}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="space-y-2 ml-12">
                      {yearTasks.map((task) => {
                        const dueDate = task.aftercare_due_date ? new Date(task.aftercare_due_date) : null;
                        const isHistorical = (task as any).historical_skip === true;
                        const isOverdue = dueDate && isPast(dueDate) && !task.completed && !isHistorical;
                        const isDueToday = dueDate && isToday(dueDate);

                        return (
                          <div 
                            key={task.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg",
                              task.completed && "bg-muted/50",
                              isHistorical && "bg-slate-100 dark:bg-slate-900/50 opacity-60",
                              isOverdue && "bg-red-50 dark:bg-red-950/20",
                              isDueToday && !task.completed && "bg-amber-50 dark:bg-amber-950/20"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => handleTaskToggle(task.id, task.completed)}
                              disabled={isHistorical}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                task.completed && "line-through text-muted-foreground",
                                isHistorical && "text-muted-foreground"
                              )}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Task assignee */}
                            {team?.id && (
                              <AftercareTaskAssignee
                                taskId={task.id}
                                assignedTo={(task as any).assigned_to}
                                pastSaleId={pastSale.id}
                              />
                            )}

                            {isHistorical ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <Clock className="h-3 w-3" />
                                      Historical
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This task was due before import and has been skipped</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : dueDate && (
                              <div className={cn(
                                "flex items-center gap-1 text-xs",
                                isOverdue && "text-red-600",
                                isDueToday && "text-amber-600"
                              )}>
                                <Clock className="h-3 w-3" />
                                {format(dueDate, 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>

      {/* Refresh Dialog */}
      {originalTemplate && refreshComparison && (
        <AftercareRefreshDialog
          open={showRefreshDialog}
          onOpenChange={setShowRefreshDialog}
          template={originalTemplate}
          keeping={refreshComparison.keeping}
          adding={refreshComparison.adding}
          removing={refreshComparison.removing}
          completed={refreshComparison.completed}
          onConfirm={handleConfirmRefresh}
          isPending={refreshFromTemplate.isPending}
        />
      )}
    </div>
  );
}

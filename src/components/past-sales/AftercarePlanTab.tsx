import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Calendar, Check, Clock, Heart, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAftercareTasks } from "@/hooks/useAftercareTasks";
import { useAftercareTemplates } from "@/hooks/useAftercareTemplates";
import { RelationshipHealthBadge } from "./RelationshipHealthBadge";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { PastSale } from "@/hooks/usePastSales";

interface AftercarePlanTabProps {
  pastSale: PastSale;
}

export function AftercarePlanTab({ pastSale }: AftercarePlanTabProps) {
  const { user } = useAuth();
  const { team } = useTeam();
  const { tasks, isLoading, healthData, generateAftercareTasks, completeTask } = useAftercareTasks(pastSale.id);
  const { getEffectiveTemplate } = useAftercareTemplates(team?.id);
  const [expandedYear, setExpandedYear] = useState<number | null>(0);

  const isAftercareActive = pastSale.aftercare_status === 'active';
  const settlementDate = pastSale.settlement_date;
  const vendorFirstName = pastSale.vendor_details?.primary?.first_name;

  const handleStartAftercare = async () => {
    if (!settlementDate || !team?.id || !user?.id) return;
    
    const template = getEffectiveTemplate(user.id);
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

  if (!isAftercareActive && pastSale.aftercare_status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="relative">
          <Heart className="h-16 w-16 text-muted-foreground/30" />
          <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <Play className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Start Aftercare Plan</h3>
          <p className="text-muted-foreground max-w-md">
            Activate the 10-year relationship nurturing plan to stay connected with {vendorFirstName || 'your client'} through settlement follow-ups and annual anniversaries.
          </p>
        </div>

        <Button 
          onClick={handleStartAftercare} 
          disabled={generateAftercareTasks.isPending || !settlementDate}
          size="lg"
          className="gap-2"
        >
          <Heart className="h-4 w-4" />
          {generateAftercareTasks.isPending ? "Creating Plan..." : "Activate Aftercare Plan"}
        </Button>

        {!settlementDate && (
          <p className="text-sm text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Add a settlement date to enable aftercare
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
            <div className="flex items-center gap-4">
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
                        const isOverdue = dueDate && isPast(dueDate) && !task.completed;
                        const isDueToday = dueDate && isToday(dueDate);

                        return (
                          <div 
                            key={task.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg",
                              task.completed && "bg-muted/50",
                              isOverdue && "bg-red-50 dark:bg-red-950/20",
                              isDueToday && !task.completed && "bg-amber-50 dark:bg-amber-950/20"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => completeTask.mutate(task.id)}
                            />
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-medium",
                                task.completed && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            {dueDate && (
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
    </div>
  );
}

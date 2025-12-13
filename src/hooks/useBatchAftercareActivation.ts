import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, addYears, format, differenceInYears, isPast } from "date-fns";
import { AftercareTemplate, AftercareTask, HistoricalTaskMode, AftercareImportSummary } from "@/types/aftercare";
import { Json } from "@/integrations/supabase/types";

interface BatchActivationParams {
  pastSaleIds: string[];
  pastSalesData: Array<{ id: string; settlement_date: string | null; agent_id: string | null }>;
  template: AftercareTemplate;
  evergreenTemplate: AftercareTemplate | null;
  teamId: string;
  userId: string;
  historicalMode: HistoricalTaskMode;
}

export function useBatchAftercareActivation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activateBatchAftercare = useMutation({
    mutationFn: async ({
      pastSaleIds,
      pastSalesData,
      template,
      evergreenTemplate,
      teamId,
      userId,
      historicalMode
    }: BatchActivationParams): Promise<AftercareImportSummary> => {
      const now = new Date();
      const summary: AftercareImportSummary = {
        totalPlansActivated: 0,
        tasksCreated: 0,
        tasksSkipped: 0,
        tasksMarkedHistorical: 0,
        evergreenPlansCreated: 0
      };

      const allTasks: any[] = [];
      const pastSalesToUpdate: string[] = [];

      for (const pastSale of pastSalesData) {
        if (!pastSale.settlement_date) continue;

        const settlement = new Date(pastSale.settlement_date);
        const yearsAgo = differenceInYears(now, settlement);
        const assignedTo = pastSale.agent_id || userId;

        // Determine which template to use
        const useEvergreen = yearsAgo > 10 && evergreenTemplate;
        const activeTemplate = useEvergreen ? evergreenTemplate : template;

        if (useEvergreen) {
          summary.evergreenPlansCreated++;
          // For evergreen: generate tasks for next 5 years from NOW
          const evergreenTasks = generateEvergreenTasks(
            pastSale.id,
            settlement,
            yearsAgo,
            evergreenTemplate!,
            teamId,
            assignedTo
          );
          allTasks.push(...evergreenTasks);
          summary.tasksCreated += evergreenTasks.length;
        } else {
          // Standard template with historical handling
          const { tasks, skipped, historical } = generateSmartTasks(
            pastSale.id,
            settlement,
            activeTemplate,
            teamId,
            assignedTo,
            historicalMode,
            now
          );
          allTasks.push(...tasks);
          summary.tasksCreated += tasks.length;
          summary.tasksSkipped += skipped;
          summary.tasksMarkedHistorical += historical;
        }

        pastSalesToUpdate.push(pastSale.id);
        summary.totalPlansActivated++;
      }

      // Batch insert tasks
      if (allTasks.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < allTasks.length; i += chunkSize) {
          const chunk = allTasks.slice(i, i + chunkSize);
          const { error } = await supabase.from('tasks').insert(chunk);
          if (error) throw error;
        }
      }

      // Update past sales with aftercare status
      if (pastSalesToUpdate.length > 0) {
        const { error } = await supabase
          .from('past_sales')
          .update({
            aftercare_template_id: template.id,
            aftercare_started_at: new Date().toISOString(),
            aftercare_status: 'active'
          })
          .in('id', pastSalesToUpdate);
        
        if (error) throw error;
      }

      return summary;
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['past-sales'] });
      
      let message = `${summary.totalPlansActivated} aftercare plans activated`;
      if (summary.evergreenPlansCreated > 0) {
        message += ` (${summary.evergreenPlansCreated} evergreen)`;
      }
      
      toast({ 
        title: "Aftercare Plans Activated! 🎉", 
        description: message 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to activate aftercare plans", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  return { activateBatchAftercare };
}

function generateSmartTasks(
  pastSaleId: string,
  settlement: Date,
  template: AftercareTemplate,
  teamId: string,
  assignedTo: string,
  historicalMode: HistoricalTaskMode,
  now: Date
): { tasks: any[]; skipped: number; historical: number } {
  const tasks: any[] = [];
  let skipped = 0;
  let historical = 0;

  for (const task of template.tasks) {
    let dueDate: Date;
    let aftercareYear: number | null = null;

    if (task.timing_type === 'immediate' && task.days_offset !== null) {
      dueDate = addDays(settlement, task.days_offset);
      aftercareYear = 0;
    } else if (task.timing_type === 'anniversary' && task.anniversary_year !== null) {
      dueDate = addYears(settlement, task.anniversary_year);
      aftercareYear = task.anniversary_year;
    } else {
      dueDate = settlement;
    }

    const isTaskInPast = isPast(dueDate);

    // Handle historical tasks based on mode
    if (isTaskInPast) {
      if (historicalMode === 'skip') {
        // Create task but mark as historical_skip
        tasks.push({
          title: task.title,
          description: task.description,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          past_sale_id: pastSaleId,
          aftercare_year: aftercareYear,
          aftercare_due_date: format(dueDate, 'yyyy-MM-dd'),
          team_id: teamId,
          assigned_to: assignedTo,
          completed: false,
          historical_skip: true,
          created_by: assignedTo
        });
        historical++;
        continue;
      } else if (historicalMode === 'complete') {
        // Create as completed
        tasks.push({
          title: task.title,
          description: task.description,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          past_sale_id: pastSaleId,
          aftercare_year: aftercareYear,
          aftercare_due_date: format(dueDate, 'yyyy-MM-dd'),
          team_id: teamId,
          assigned_to: assignedTo,
          completed: true,
          completed_at: format(dueDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          historical_skip: false,
          created_by: assignedTo
        });
        continue;
      }
      // 'include' mode falls through to normal creation
    }

    // Create normal task
    tasks.push({
      title: task.title,
      description: task.description,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      past_sale_id: pastSaleId,
      aftercare_year: aftercareYear,
      aftercare_due_date: format(dueDate, 'yyyy-MM-dd'),
      team_id: teamId,
      assigned_to: assignedTo,
      completed: false,
      historical_skip: false,
      created_by: assignedTo
    });
  }

  return { tasks, skipped, historical };
}

function generateEvergreenTasks(
  pastSaleId: string,
  settlement: Date,
  yearsAgo: number,
  template: AftercareTemplate,
  teamId: string,
  assignedTo: string
): any[] {
  const tasks: any[] = [];
  const now = new Date();
  
  // Calculate next 5 anniversaries from now
  const nextAnniversaryYear = yearsAgo + 1;
  
  for (let i = 0; i < 5; i++) {
    const anniversaryYear = nextAnniversaryYear + i;
    const dueDate = addYears(settlement, anniversaryYear);
    
    // Skip if this anniversary is in the past
    if (isPast(dueDate)) continue;
    
    // Cycle through template tasks
    const templateTask = template.tasks[i % template.tasks.length];
    
    tasks.push({
      title: templateTask.title,
      description: `${templateTask.description} (Year ${anniversaryYear})`,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      past_sale_id: pastSaleId,
      aftercare_year: anniversaryYear,
      aftercare_due_date: format(dueDate, 'yyyy-MM-dd'),
      team_id: teamId,
      assigned_to: assignedTo,
      completed: false,
      historical_skip: false,
      created_by: assignedTo
    });
  }

  return tasks;
}

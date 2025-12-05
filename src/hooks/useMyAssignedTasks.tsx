import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfToday, isPast, isToday, isThisWeek } from "date-fns";

export interface AssignedTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  completed: boolean;
  
  // Source indicator
  source: 'transaction' | 'project' | 'planner' | 'appraisal';
  
  // Transaction context
  transaction_id?: string | null;
  transaction?: {
    id: string;
    address: string;
    stage: string | null;
  } | null;
  
  // Project context
  project_id?: string | null;
  project?: {
    id: string;
    title: string;
    icon: string | null;
    color: string | null;
  } | null;
  
  // Planner context
  planner_time?: string | null;
  size_category?: string | null;
  
  // Appraisal context
  appraisal_id?: string | null;
  appraisal?: {
    id: string;
    address: string;
    stage: string | null;
    vendor_name: string | null;
  } | null;
  
  // Creator info (for transaction tasks)
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface GroupedAssignedTasks {
  overdue: AssignedTask[];
  dueToday: AssignedTask[];
  thisWeek: AssignedTask[];
  upcoming: AssignedTask[];
  noDueDate: AssignedTask[];
  all: AssignedTask[];
}

export const useMyAssignedTasks = () => {
  const { user } = useAuth();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["my-assigned-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const allAssignments: AssignedTask[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch transaction tasks (assigned directly via assigned_to, excluding appraisal tasks)
      const { data: transactionTasks } = await (supabase as any)
        .from('tasks')
        .select(`
          id, title, description, due_date, priority, completed,
          transaction_id, appraisal_id,
          transaction:transaction_id(id, address, stage),
          creator:created_by(id, full_name, avatar_url)
        `)
        .eq('assigned_to', user.id)
        .eq('completed', false)
        .is('appraisal_id', null);

      transactionTasks?.forEach((task: any) => {
        if (!seenIds.has(task.id)) {
          seenIds.add(task.id);
          allAssignments.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            completed: task.completed,
            source: 'transaction',
            transaction_id: task.transaction_id,
            transaction: task.transaction,
            creator: task.creator,
          });
        }
      });

      // 2. Fetch appraisal tasks (assigned via assigned_to with appraisal_id)
      const { data: appraisalTasks } = await (supabase as any)
        .from('tasks')
        .select(`
          id, title, description, due_date, priority, completed,
          appraisal_id, appraisal_stage,
          logged_appraisals!appraisal_id(id, address, stage, vendor_name)
        `)
        .eq('assigned_to', user.id)
        .eq('completed', false)
        .not('appraisal_id', 'is', null);

      appraisalTasks?.forEach((task: any) => {
        if (!seenIds.has(task.id)) {
          seenIds.add(task.id);
          allAssignments.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            completed: task.completed,
            source: 'appraisal',
            appraisal_id: task.appraisal_id,
            appraisal: task.logged_appraisals,
          });
        }
      });

      // 3. Fetch project tasks via task_assignees junction
      const { data: projectAssignments } = await (supabase as any)
        .from('task_assignees')
        .select(`
          task:task_id(
            id, title, description, due_date, priority, completed,
            project_id,
            project:project_id(id, title, icon, color)
          )
        `)
        .eq('user_id', user.id);

      projectAssignments?.forEach((item: any) => {
        const task = item.task;
        if (task && !task.completed && !seenIds.has(task.id)) {
          seenIds.add(task.id);
          allAssignments.push({
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            priority: task.priority,
            completed: task.completed,
            source: 'project',
            project_id: task.project_id,
            project: task.project,
          });
        }
      });

      // 4. Fetch daily planner items via daily_planner_assignments junction
      const { data: plannerAssignments } = await (supabase as any)
        .from('daily_planner_assignments')
        .select(`
          planner_item:planner_item_id(
            id, title, description, date, time, completed, size_category
          )
        `)
        .eq('user_id', user.id);

      plannerAssignments?.forEach((item: any) => {
        const planner = item.planner_item;
        if (planner && !planner.completed) {
          // Planner items have different ID space, prefix to avoid any collision
          const plannerTaskId = `planner_${planner.id}`;
          if (!seenIds.has(plannerTaskId)) {
            seenIds.add(plannerTaskId);
            allAssignments.push({
              id: planner.id,
              title: planner.title,
              description: planner.description,
              due_date: planner.date, // Use date field as due_date
              priority: null,
              completed: planner.completed,
              source: 'planner',
              planner_time: planner.time,
              size_category: planner.size_category,
            });
          }
        }
      });

      return allAssignments;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 120000,
  });

  // Group tasks by date categories
  const groupedTasks: GroupedAssignedTasks = {
    overdue: [],
    dueToday: [],
    thisWeek: [],
    upcoming: [],
    noDueDate: [],
    all: tasks,
  };

  const today = startOfToday();

  tasks.forEach((task) => {
    if (!task.due_date) {
      groupedTasks.noDueDate.push(task);
      return;
    }
    
    const dueDate = new Date(task.due_date);

    if (isPast(dueDate) && !isToday(dueDate)) {
      groupedTasks.overdue.push(task);
    } else if (isToday(dueDate)) {
      groupedTasks.dueToday.push(task);
    } else if (isThisWeek(dueDate)) {
      groupedTasks.thisWeek.push(task);
    } else {
      groupedTasks.upcoming.push(task);
    }
  });

  const stats = {
    total: tasks.length,
    overdue: groupedTasks.overdue.length,
    dueToday: groupedTasks.dueToday.length,
    thisWeek: groupedTasks.thisWeek.length,
    upcoming: groupedTasks.upcoming.length,
    noDueDate: groupedTasks.noDueDate.length,
  };

  return {
    tasks: groupedTasks,
    stats,
    isLoading,
    refetch,
  };
};

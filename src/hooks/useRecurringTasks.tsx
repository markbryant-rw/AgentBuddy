import { toast } from 'sonner';

// Stubbed hook - recurring tasks feature coming soon
// The daily_planner_recurring_templates table is not yet implemented

export interface RecurringTemplate {
  id: string;
  team_id: string;
  title: string;
  size_category: 'big' | 'medium' | 'little';
  estimated_minutes: number | null;
  notes: string | null;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  recurrence_days: number[] | null;
  start_date: string;
  end_date: string | null;
  created_by: string;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useRecurringTasks() {
  const templates: RecurringTemplate[] = [];
  const isLoading = false;

  const generateForDate = (date: Date) => {
    toast.info('Recurring tasks coming soon');
  };

  const createTemplate = (data: any) => {
    toast.info('Recurring tasks coming soon');
  };

  const updateTemplate = (data: any) => {
    toast.info('Recurring tasks coming soon');
  };

  const deleteTemplate = (id: string) => {
    toast.info('Recurring tasks coming soon');
  };

  return {
    templates,
    isLoading,
    generateForDate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
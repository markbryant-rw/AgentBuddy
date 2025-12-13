// Aftercare Plan type definitions

export interface AftercareTask {
  title: string;
  description: string;
  timing_type: 'immediate' | 'anniversary';
  days_offset: number | null;
  anniversary_year: number | null;
  is_mandatory: boolean;
}

export interface AftercareTemplate {
  id: string;
  name: string;
  description: string | null;
  scope: 'platform' | 'office' | 'team' | 'user';
  agency_id: string | null;
  team_id: string | null;
  user_id: string | null;
  is_system_template: boolean;
  is_default: boolean;
  tasks: AftercareTask[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RelationshipHealthData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  healthScore: number;
  status: 'healthy' | 'attention' | 'at-risk';
}

export type AftercareStatus = 'pending' | 'active' | 'paused' | 'completed';

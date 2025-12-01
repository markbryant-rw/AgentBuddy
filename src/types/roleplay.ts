export interface RoleplayScenario {
  id: string;
  type: 'buyer' | 'seller';
  call_type: 'inbound' | 'outbound';
  scenario_name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  system_prompt: string;
  objectives?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleplaySession {
  id: string;
  user_id: string;
  team_id?: string;
  scenario_id?: string;
  config: {
    type: 'buyer' | 'seller';
    call_type: 'inbound' | 'outbound';
    difficulty: 'easy' | 'medium' | 'hard';
    scenario_name: string;
    voice?: string;
  };
  transcript: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  duration_seconds?: number;
  rating?: number;
  analysis?: {
    overall_rating: number;
    strengths: string[];
    improvements: string[];
    key_moments: Array<{
      timestamp: string;
      exchange: string;
      commentary: string;
      type: 'positive' | 'negative';
    }>;
    next_steps: string[];
  };
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleplaySessionMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  created_at: string;
}

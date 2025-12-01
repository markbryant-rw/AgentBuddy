export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export interface CollaborativeConversation {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  is_starred: boolean;
  is_shared: boolean;
  share_with_friends: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  contributor_count?: number;
  contributors?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

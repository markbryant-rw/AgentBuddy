import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  notify_friend_checkin: boolean;
  notify_conversation_share: boolean;
  notify_email: boolean;
  profile_visibility: 'public' | 'friends' | 'private';
  stats_visibility: 'public' | 'friends' | 'private';
  leaderboard_participation: boolean;
  dashboard_edit_mode: boolean;
  module_visibility: Record<string, boolean>;
  pipeline_view_preference: 'individual' | 'team' | 'both';
  default_home_view: 'hub' | 'performance';
  show_daily_digest: boolean;
  quick_actions_visible: boolean;
  expanded_module_sections: string[];
  collapsed_hub_tasks: boolean;
  collapsed_hub_messages: boolean;
  collapsed_hub_digest: boolean;
  collapsed_hub_performance: boolean;
  collapsed_logging_leaderboard: boolean;
  default_transaction_role_salesperson: string | null;
  default_transaction_role_admin: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  theme: 'system',
  notify_friend_checkin: true,
  notify_conversation_share: true,
  notify_email: true,
  profile_visibility: 'public',
  stats_visibility: 'public',
  leaderboard_participation: true,
  dashboard_edit_mode: false,
  module_visibility: {},
  pipeline_view_preference: 'both',
  default_home_view: 'hub',
  show_daily_digest: true,
  quick_actions_visible: true,
  expanded_module_sections: [],
  collapsed_hub_tasks: false,
  collapsed_hub_messages: false,
  collapsed_hub_digest: false,
  collapsed_hub_performance: false,
  collapsed_logging_leaderboard: false,
  default_transaction_role_salesperson: null,
  default_transaction_role_admin: null,
};

// Stubbed hook - user_preferences table not yet implemented
export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    // Return default preferences since table doesn't exist
    setPreferences({
      ...DEFAULT_PREFERENCES,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!preferences) return;
    // Just update local state since table doesn't exist
    setPreferences({ ...preferences, ...updates, updated_at: new Date().toISOString() });
  };

  const toggleModuleVisibility = async (moduleId: string) => {
    if (!preferences) return;
    const currentVisibility = preferences.module_visibility || {};
    const newVisibility = {
      ...currentVisibility,
      [moduleId]: !currentVisibility[moduleId],
    };
    await updatePreferences({ module_visibility: newVisibility });
  };

  const toggleHubTasks = async () => {
    if (!preferences || loading) return;
    await updatePreferences({ collapsed_hub_tasks: !preferences.collapsed_hub_tasks });
  };

  const toggleHubMessages = async () => {
    if (!preferences || loading) return;
    await updatePreferences({ collapsed_hub_messages: !preferences.collapsed_hub_messages });
  };

  const toggleHubDigest = async () => {
    if (!preferences || loading) return;
    await updatePreferences({ collapsed_hub_digest: !preferences.collapsed_hub_digest });
  };

  const toggleHubPerformance = async () => {
    if (!preferences || loading) return;
    await updatePreferences({ collapsed_hub_performance: !preferences.collapsed_hub_performance });
  };

  const toggleLoggingLeaderboard = async () => {
    if (!preferences || loading) return;
    await updatePreferences({ collapsed_logging_leaderboard: !preferences.collapsed_logging_leaderboard });
  };

  const toggleHubRowOne = async () => {
    if (!preferences || loading) return;
    const newState = !preferences.collapsed_hub_digest;
    await updatePreferences({ 
      collapsed_hub_digest: newState,
      collapsed_hub_performance: newState
    });
  };

  const toggleHubRowTwo = async () => {
    if (!preferences || loading) return;
    const newState = !preferences.collapsed_hub_tasks;
    await updatePreferences({ 
      collapsed_hub_tasks: newState,
      collapsed_hub_messages: newState
    });
  };

  return {
    preferences: preferences || { 
      ...DEFAULT_PREFERENCES, 
      user_id: user?.id || '', 
      created_at: '', 
      updated_at: '' 
    } as UserPreferences,
    loading,
    updatePreferences,
    toggleModuleVisibility,
    toggleHubTasks,
    toggleHubMessages,
    toggleHubDigest,
    toggleHubPerformance,
    toggleLoggingLeaderboard,
    toggleHubRowOne,
    toggleHubRowTwo,
    refreshPreferences: fetchPreferences,
  };
};
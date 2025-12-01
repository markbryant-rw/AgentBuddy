import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newPrefs) throw new Error('Failed to create preferences - no data returned');
        setPreferences(newPrefs as UserPreferences);
      } else {
        setPreferences(data as UserPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setPreferences(null);
      setLoading(false);
    }
  }, [user, fetchPreferences]);

  const updatePreferences = async (updates: Partial<Omit<UserPreferences, 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user || !preferences || loading) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update preferences - no data returned');

      setPreferences(data as UserPreferences);
      // Silent update - no toast notification
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      throw error;
    }
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

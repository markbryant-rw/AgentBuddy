import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface SocialPreferences {
  reflectionReminders: {
    enabled: boolean;
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    time: string; // "HH:MM" format
  };
  defaultPostVisibility: 'public' | 'team_only' | 'friends_only' | 'office_only';
  notifications: {
    postReactions: boolean;
    postComments: boolean;
    postMentions: boolean;
    birthdayReminders: boolean;
    birthdayUpcoming: boolean;
    reflectionReminders: boolean;
    teamReflections: boolean;
  };
}

const DEFAULT_PREFERENCES: SocialPreferences = {
  reflectionReminders: {
    enabled: true,
    day: 'friday',
    time: '17:00'
  },
  defaultPostVisibility: 'team_only',
  notifications: {
    postReactions: true,
    postComments: true,
    postMentions: true,
    birthdayReminders: true,
    birthdayUpcoming: true,
    reflectionReminders: true,
    teamReflections: true
  }
};

export const useSocialPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['social-preferences', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_PREFERENCES;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('social_preferences')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching social preferences:', error);
        return DEFAULT_PREFERENCES;
      }
      
      // Merge with defaults to ensure all fields exist
      const savedPrefs = data?.social_preferences as any;
      if (!savedPrefs) return DEFAULT_PREFERENCES;
      
      return {
        reflectionReminders: {
          ...DEFAULT_PREFERENCES.reflectionReminders,
          ...(savedPrefs.reflectionReminders || {})
        },
        defaultPostVisibility: savedPrefs.defaultPostVisibility || DEFAULT_PREFERENCES.defaultPostVisibility,
        notifications: {
          ...DEFAULT_PREFERENCES.notifications,
          ...(savedPrefs.notifications || {})
        }
      } as SocialPreferences;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<SocialPreferences>) => {
      if (!user) throw new Error('Not authenticated');

      const currentPrefs = preferences || DEFAULT_PREFERENCES;
      const newPrefs = {
        ...currentPrefs,
        ...updates,
        reflectionReminders: {
          ...currentPrefs.reflectionReminders,
          ...(updates.reflectionReminders || {})
        },
        notifications: {
          ...currentPrefs.notifications,
          ...(updates.notifications || {})
        }
      };

      const { data, error } = await supabase
        .from('profiles')
        .update({ social_preferences: newPrefs })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-preferences'] });
      toast.success('Social preferences updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update preferences: ' + error.message);
    },
  });

  return {
    preferences: preferences || DEFAULT_PREFERENCES,
    loading: isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
};

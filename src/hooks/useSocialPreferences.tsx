import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface SocialPreferences {
  reflectionReminders: {
    enabled: boolean;
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    time: string;
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
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['social-preferences'],
    queryFn: async () => {
      // Feature not yet implemented - return defaults
      return DEFAULT_PREFERENCES;
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (_updates: Partial<SocialPreferences>) => {
      // Not implemented
      toast.info('Social preferences feature coming soon');
      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-preferences'] });
    },
  });

  return {
    preferences: preferences || DEFAULT_PREFERENCES,
    loading: isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  notify_team_member_joined: boolean;
  notify_listing_stage_signed: boolean;
  notify_listing_stage_live: boolean;
  notify_listing_stage_contract: boolean;
  notify_listing_stage_unconditional: boolean;
  notify_listing_stage_settled: boolean;
  notify_task_assigned: boolean;
  notify_task_due_soon: boolean;
  email_digest_enabled: boolean;
  email_digest_frequency: 'daily' | 'weekly' | 'none';
  email_digest_hour: number;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id'> = {
  push_enabled: false,
  notify_team_member_joined: true,
  notify_listing_stage_signed: true,
  notify_listing_stage_live: true,
  notify_listing_stage_contract: true,
  notify_listing_stage_unconditional: true,
  notify_listing_stage_settled: true,
  notify_task_assigned: true,
  notify_task_due_soon: true,
  email_digest_enabled: true,
  email_digest_frequency: 'daily',
  email_digest_hour: 8,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to fetch existing preferences
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification preferences:', error);
        throw error;
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...DEFAULT_PREFERENCES })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating notification preferences:', insertError);
          throw insertError;
        }

        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences', user?.id], data);
      toast.success('Preferences updated');
    },
    onError: (error) => {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update preferences');
    },
  });

  return {
    preferences: preferences || { ...DEFAULT_PREFERENCES, id: '', user_id: user?.id || '' },
    isLoading,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

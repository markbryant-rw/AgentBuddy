import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { preloadUserAvatar } from '@/lib/imagePreloader';
import { logger } from '@/lib/logger';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: 'agent' | 'associate' | 'va' | 'admin_staff';
  primary_team_id: string | null;
  office_id: string | null;
  active_role?: string | null;
  employs: string[] | null;
  reports_to: string | null;
  uses_financial_year: boolean;
  fy_start_month: number;
  birthday: string | null;
  birthday_visibility: 'team_only' | 'friends_only' | 'public' | 'private' | null;
  mobile_number: string | null;
  total_bug_points?: number;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!user) {
        logger.log('[useProfile] No user provided');
        return null;
      }
      
      logger.log('[useProfile] Fetching profile for user', { userId: user.id });
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, avatar_url, user_type,
          primary_team_id, office_id, employs, reports_to,
          uses_financial_year, fy_start_month, birthday, birthday_visibility,
          mobile_number, created_at, updated_at, invite_code, presence_status, last_active_at
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        logger.error('[useProfile] Error fetching profile', error);
        return null;
      }
      
      logger.log('[useProfile] Profile loaded', {
        id: data?.id,
        primary_team_id: data?.primary_team_id,
        office_id: data?.office_id,
      });
      
      // Preload avatar image for instant display
      if (data?.avatar_url) {
        preloadUserAvatar(data.avatar_url);
      }
      
      return data as UserProfile;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfileMutation.mutateAsync({ avatar_url: publicUrl });
      
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      logger.error('Error uploading avatar', error);
      toast.error('Failed to upload avatar');
      throw error;
    }
  };

  logger.log('[useProfile] State', { 
    hasProfile: !!profile, 
    isLoading,
    primary_team_id: profile?.primary_team_id,
    office_id: profile?.office_id,
  });

  return {
    profile,
    loading: isLoading,
    updateProfile: updateProfileMutation.mutate,
    uploadAvatar,
    refreshProfile: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
  };
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserWithoutRole {
  user_id: string;
  email: string;
  full_name: string;
  office_id: string | null;
  created_at: string;
}

export const useUsersWithoutRoles = () => {
  return useQuery({
    queryKey: ['users-without-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detect_users_without_roles');

      if (error) throw error;

      return (data || []) as UserWithoutRole[];
    },
    refetchInterval: 120000, // Refresh every 2 minutes
  });
};

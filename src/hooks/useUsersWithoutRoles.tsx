import { useQuery } from '@tanstack/react-query';

interface UserWithoutRole {
  user_id: string;
  email: string;
  full_name: string;
  office_id: string | null;
  created_at: string;
}

// Stubbed hook - RPC function detect_users_without_roles not implemented
export const useUsersWithoutRoles = () => {
  return useQuery({
    queryKey: ['users-without-roles'],
    queryFn: async (): Promise<UserWithoutRole[]> => {
      // RPC function not implemented - return empty array
      return [];
    },
    refetchInterval: 120000,
  });
};

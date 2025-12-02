import { useQuery } from '@tanstack/react-query';

// Stubbed hook - user_activity_log table not yet implemented
export const useUserActivity = (userId: string) => {
  return useQuery({
    queryKey: ['user-activity', userId],
    queryFn: async () => {
      // Table not implemented - return empty array
      return [];
    },
    enabled: !!userId,
  });
};
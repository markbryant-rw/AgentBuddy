import { useQuery } from '@tanstack/react-query';

// Stubbed out - task_boards table not implemented yet
export const useAdminTasks = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['admin-tasks', userId],
    queryFn: async () => {
      return null;
    },
    enabled: !!userId,
  });
};

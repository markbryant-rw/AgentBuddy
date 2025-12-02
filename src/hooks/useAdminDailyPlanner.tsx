import { useQuery } from '@tanstack/react-query';

// Stubbed out - admin daily planner functionality not fully implemented yet
export const useAdminDailyPlanner = (role: 'platform_admin' | 'office_manager') => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-daily-planner', role],
    queryFn: async () => {
      return [];
    },
  });

  const addItem = async () => {
    // Stubbed
  };

  const toggleComplete = async () => {
    // Stubbed
  };

  const deleteItem = async () => {
    // Stubbed
  };

  return {
    items,
    isLoading,
    addItem,
    toggleComplete,
    deleteItem,
  };
};

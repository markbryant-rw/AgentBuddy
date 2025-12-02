// Stubbed - task_boards table not implemented
export const useAdminTaskBoard = (_role: 'platform_admin' | 'office_manager') => {
  return {
    board: null,
    lists: [],
    tasks: [],
    isLoading: false,
    addTask: async () => {},
  };
};

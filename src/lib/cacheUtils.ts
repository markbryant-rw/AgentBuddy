import { queryClient } from './queryClient';

/**
 * Force clear all React Query cache and refetch all queries
 * Useful after major data migrations or when data visibility issues occur
 */
export const clearAllCache = () => {
  queryClient.clear();
  queryClient.refetchQueries({ type: 'active' });
};

/**
 * Clear specific query cache by key pattern
 */
export const clearCacheByPattern = (pattern: string) => {
  queryClient.removeQueries({ 
    predicate: (query) => {
      return query.queryKey.some(key => 
        typeof key === 'string' && key.includes(pattern)
      );
    }
  });
};

/**
 * Force refetch all team-related data
 */
export const refetchTeamData = () => {
  queryClient.invalidateQueries({ queryKey: ['team-members'] });
  queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['pastSales'] });
  queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
  queryClient.invalidateQueries({ queryKey: ['all-offices'] });
  queryClient.invalidateQueries({ queryKey: ['assigned-offices'] });
  queryClient.invalidateQueries({ queryKey: ['active-office'] });
  queryClient.invalidateQueries({ queryKey: ['office-stats'] });
  queryClient.refetchQueries({ type: 'active' });
};

import { useState } from 'react';

export interface UserFilters {
  search: string;
  roles: string[];
  agency: string;
  hasTeam: boolean | null;
  activeStatus: 'all' | 'active-7' | 'active-30' | 'active-90';
}

export const useUserFilters = () => {
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    roles: [],
    agency: '',
    hasTeam: null,
    activeStatus: 'all',
  });

  const updateFilter = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      roles: [],
      agency: '',
      hasTeam: null,
      activeStatus: 'all',
    });
  };

  return {
    filters,
    updateFilter,
    clearFilters,
  };
};

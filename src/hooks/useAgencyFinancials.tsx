import { useQuery } from '@tanstack/react-query';

// Stubbed out - agency_financials table not implemented yet
export const useAgencyFinancials = () => {
  return {
    financials: [],
    isLoading: false,
    updateFinancials: async () => {},
    isUpdating: false,
    totalMRR: 0,
    totalARR: 0,
    averageDealSize: 0,
  };
};

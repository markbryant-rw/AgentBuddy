import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl: string;
}

export const useBillingHistory = () => {
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['billing-history', user?.id],
    queryFn: async (): Promise<Invoice[]> => {
      if (!user) return [];

      // Mock invoice data for UI-only version
      // In real implementation, this would fetch from Stripe
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          date: '2025-09-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: '2',
          date: '2025-08-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: '3',
          date: '2025-07-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: '4',
          date: '2025-06-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: '5',
          date: '2025-05-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
        {
          id: '6',
          date: '2025-04-27',
          description: 'Individual Plan - Monthly',
          amount: 29.00,
          status: 'paid',
          downloadUrl: '#',
        },
      ];

      return mockInvoices;
    },
    enabled: !!user,
  });

  return {
    invoices,
    isLoading,
  };
};

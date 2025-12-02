import { useQuery } from '@tanstack/react-query';

export interface SalesInquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  inquiry_type: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useSalesInquiries = () => {
  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['sales-inquiries'],
    queryFn: async (): Promise<SalesInquiry[]> => {
      // Table not yet implemented - return empty array
      return [];
    },
  });

  return {
    inquiries,
    isLoading,
    updateStatus: (_id: string, _status: string) => {},
    updateNotes: (_id: string, _notes: string) => {},
    isUpdating: false,
  };
};

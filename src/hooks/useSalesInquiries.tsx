import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SalesInquiry {
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
  const queryClient = useQueryClient();

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['sales-inquiries'],
    queryFn: async (): Promise<SalesInquiry[]> => {
      const { data, error } = await supabase
        .from('sales_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('sales_inquiries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-inquiries'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error('Error updating status:', error);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('sales_inquiries')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-inquiries'] });
      toast.success('Notes updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update notes');
      console.error('Error updating notes:', error);
    },
  });

  return {
    inquiries,
    isLoading,
    updateStatus: (id: string, status: string) => updateStatusMutation.mutate({ id, status }),
    updateNotes: (id: string, notes: string) => updateNotesMutation.mutate({ id, notes }),
    isUpdating: updateStatusMutation.isPending || updateNotesMutation.isPending,
  };
};

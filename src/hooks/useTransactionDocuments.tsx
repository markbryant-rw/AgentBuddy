import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransactionDocument {
  id: string;
  transaction_id: string;
  stage: string;
  section?: string;
  title: string;
  required: boolean;
  status: 'pending' | 'received' | 'reviewed';
  assignees: string[];
  due_date?: string;
  attachments: Array<{ url: string; name: string; type?: string }>;
  order_index: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useTransactionDocuments = (transactionId?: string) => {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['transaction-documents', transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      
      const { data, error } = await supabase
        .from('transaction_documents' as any)
        .select('*')
        .eq('transaction_id', transactionId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as unknown as TransactionDocument[];
    },
    enabled: !!transactionId,
  });

  const createDocument = useMutation({
    mutationFn: async (doc: Partial<TransactionDocument>) => {
      const { data, error } = await supabase
        .from('transaction_documents' as any)
        .insert([doc] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Document added');
    },
    onError: (error) => {
      console.error('Error creating document:', error);
      toast.error('Failed to add document');
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TransactionDocument> }) => {
      const { data, error } = await supabase
        .from('transaction_documents' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_documents' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Document removed');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('Failed to remove document');
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: TransactionDocument['status'] }) => {
      const { error } = await supabase
        .from('transaction_documents' as any)
        .update({ status } as any)
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-documents', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Documents updated');
    },
  });

  const progress = documents.length > 0
    ? Math.round((documents.filter(d => d.status === 'reviewed').length / documents.length) * 100)
    : 0;

  return {
    documents,
    isLoading,
    progress,
    createDocument,
    updateDocument,
    deleteDocument,
    bulkUpdateStatus,
  };
};

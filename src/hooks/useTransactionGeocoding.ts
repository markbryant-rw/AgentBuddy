import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Transaction } from './useTransactions';

interface GeocodeError {
  transactionId: string;
  address: string;
  error: string;
}

const PROGRESS_KEY = 'geocoding_progress';

export const useTransactionGeocoding = () => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState(() => {
    // Restore progress from localStorage if available
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { current: 0, total: 0 };
      }
    }
    return { current: 0, total: 0 };
  });
  const [errors, setErrors] = useState<GeocodeError[]>([]);
  const queryClient = useQueryClient();

  const geocodeTransaction = async (transaction: Transaction): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-transaction', {
        body: { transactionId: transaction.id },
      });

      if (error) {
        console.error('Geocoding error:', error);
        setErrors(prev => [...prev, {
          transactionId: transaction.id,
          address: transaction.address,
          error: error.message || 'Geocoding failed',
        }]);
        return false;
      }

      if (data?.success) {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        return true;
      }

      // Handle address not found (success: false but not an error)
      if (data?.error === 'Address not found') {
        setErrors(prev => [...prev, {
          transactionId: transaction.id,
          address: transaction.address,
          error: 'Address not found - use Fix Location tool',
        }]);
      }

      return false;
    } catch (error) {
      console.error('Geocoding error:', error);
      setErrors(prev => [...prev, {
        transactionId: transaction.id,
        address: transaction.address,
        error: error instanceof Error ? error.message : 'Network error',
      }]);
      return false;
    }
  };

  const geocodeAll = async (transactions: Transaction[]) => {
    const ungeocodedTransactions = transactions.filter(
      t => !t.latitude && !t.longitude && t.address && !t.archived
    );

    if (ungeocodedTransactions.length === 0) {
      toast.info('All transactions are already geocoded');
      return;
    }

    setIsGeocoding(true);
    const initialProgress = { current: 0, total: ungeocodedTransactions.length };
    setProgress(initialProgress);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(initialProgress));
    setErrors([]);

    let toastId: string | number;
    
    if (ungeocodedTransactions.length > 1) {
      toastId = toast.loading(`Geocoding properties... 0/${ungeocodedTransactions.length}`);
    }

    let successCount = 0;

    for (let i = 0; i < ungeocodedTransactions.length; i++) {
      const transaction = ungeocodedTransactions[i];
      const success = await geocodeTransaction(transaction);
      
      if (success) {
        successCount++;
      }

      const newProgress = { current: i + 1, total: ungeocodedTransactions.length };
      setProgress(newProgress);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));

      if (ungeocodedTransactions.length > 1 && toastId) {
        toast.loading(`Geocoding properties... ${i + 1}/${ungeocodedTransactions.length}`, {
          id: toastId,
        });
      }

      // Small delay between requests to be polite to the API
      if (i < ungeocodedTransactions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsGeocoding(false);
    localStorage.removeItem(PROGRESS_KEY);

    if (toastId) {
      toast.dismiss(toastId);
    }

    if (successCount === ungeocodedTransactions.length) {
      toast.success(`Successfully geocoded ${successCount} ${successCount === 1 ? 'property' : 'properties'}`);
    } else if (successCount > 0) {
      toast.warning(`Geocoded ${successCount} of ${ungeocodedTransactions.length} properties. ${errors.length} need 'Fix Location'.`, { duration: 8000 });
    } else {
      toast.error(`Could not geocode properties. Use 'Fix Location' on each property to set coordinates manually.`, { duration: 8000 });
    }
  };

  const retryFailed = async (transactions: Transaction[]) => {
    const failedTransactions = transactions.filter(
      t => t.geocode_error && !t.archived
    );

    if (failedTransactions.length === 0) {
      toast.info('No failed geocoding attempts to retry');
      return;
    }

    await geocodeAll(failedTransactions);
  };

  return {
    geocodeAll,
    geocodeTransaction,
    retryFailed,
    isGeocoding,
    progress,
    errors,
  };
};

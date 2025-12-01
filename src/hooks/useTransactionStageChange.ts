// Extract stage change logic to reusable hook
// Issue #9: Eliminate duplicate stage change logic

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TransactionStage, Transaction } from './useTransactions';
import { logger } from '@/lib/logger';

export const useTransactionStageChange = () => {
  const queryClient = useQueryClient();

  const changeStage = async (
    transactionId: string,
    newStage: TransactionStage,
    transaction?: Transaction
  ) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ stage: newStage })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success(`Moved to ${newStage}`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      // Send notification when moving to unconditional
      if (newStage === 'unconditional' && transaction) {
        try {
          await supabase.functions.invoke('notify-team-transaction', {
            body: {
              transactionId,
              eventType: 'moved_to_unconditional',
              transactionAddress: transaction.address,
              teamId: transaction.team_id,
            },
          });
        } catch (notifyError) {
          logger.error('Failed to send team notification', notifyError, {
            transactionId,
            stage: newStage,
          });
          // Don't fail the main operation if notification fails
        }
      }
    } catch (error) {
      logger.error('Failed to change transaction stage', error, {
        transactionId,
        newStage,
      });
      toast.error('Failed to update stage');
      throw error;
    }
  };

  return { changeStage };
};

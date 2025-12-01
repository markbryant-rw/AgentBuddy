import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ParsedUser } from './useUserImport';

interface InviteResult {
  userId: string;
  email: string;
  success: boolean;
  error?: string;
}

interface BulkInviteProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentEmail: string;
}

export const useBulkInvite = () => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<BulkInviteProgress | null>(null);

  const bulkInviteMutation = useMutation({
    mutationFn: async (users: ParsedUser[]): Promise<InviteResult[]> => {
      const results: InviteResult[] = [];
      const total = users.length;

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        setProgress({
          total,
          completed: i,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          currentEmail: user.email,
        });

        try {
          const { data, error } = await supabase.functions.invoke('invite-user', {
            body: {
              email: user.email.toLowerCase().trim(),
              role: user.validatedRole,
              firstName: user.first_name.trim(),
              lastName: user.last_name.trim(),
              mobile: user.normalizedMobile,
              officeId: user.officeId,
              teamId: user.teamId || null,
            },
          });

          if (error) {
            results.push({
              userId: user.id,
              email: user.email,
              success: false,
              error: error.message,
            });
          } else {
            results.push({
              userId: user.id,
              email: user.email,
              success: true,
            });
          }
        } catch (error: any) {
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: error.message || 'Unknown error',
          });
        }

        // Small delay to respect rate limits
        if (i < users.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setProgress({
        total,
        completed: total,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        currentEmail: '',
      });

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });

      if (failed === 0) {
        toast.success(`Successfully invited ${successful} user${successful !== 1 ? 's' : ''}`);
      } else {
        toast.warning(
          `Invited ${successful} user${successful !== 1 ? 's' : ''}, ${failed} failed`
        );
      }

      // Reset progress after showing results
      setTimeout(() => setProgress(null), 3000);
    },
    onError: (error: any) => {
      toast.error('Bulk invite failed: ' + error.message);
      setProgress(null);
    },
  });

  return {
    bulkInvite: bulkInviteMutation.mutateAsync,
    isInviting: bulkInviteMutation.isPending,
    progress,
  };
};

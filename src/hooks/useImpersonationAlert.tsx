import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ImpersonationAlertState {
  isBeingViewed: boolean;
  adminName: string;
  adminEmail: string;
  reason: string;
  startedAt: string;
}

export const useImpersonationAlert = () => {
  const { user, isPlatformAdmin } = useAuth();
  const [alertState, setAlertState] = useState<ImpersonationAlertState>({
    isBeingViewed: false,
    adminName: '',
    adminEmail: '',
    reason: '',
    startedAt: '',
  });

  useEffect(() => {
    // Platform admins viewing as others shouldn't see the alert
    if (!user || isPlatformAdmin) {
      setAlertState({
        isBeingViewed: false,
        adminName: '',
        adminEmail: '',
        reason: '',
        startedAt: '',
      });
      return;
    }

    const checkImpersonation = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_impersonation_log')
          .select(`
            id,
            reason,
            started_at,
            admin:admin_id (
              full_name,
              email
            )
          `)
          .eq('impersonated_user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking impersonation status:', error);
          return;
        }

        if (data) {
          setAlertState({
            isBeingViewed: true,
            adminName: data.admin?.full_name || 'Unknown Admin',
            adminEmail: data.admin?.email || '',
            reason: data.reason,
            startedAt: data.started_at,
          });
        } else {
          setAlertState({
            isBeingViewed: false,
            adminName: '',
            adminEmail: '',
            reason: '',
            startedAt: '',
          });
        }
      } catch (error) {
        console.error('Error in useImpersonationAlert:', error);
      }
    };

    checkImpersonation();

    // Set up real-time subscription to detect when impersonation starts/stops
    const channel = supabase
      .channel('impersonation-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_impersonation_log',
          filter: `impersonated_user_id=eq.${user.id}`,
        },
        () => {
          checkImpersonation();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, isPlatformAdmin]);

  return alertState;
};

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
    // Don't show alerts for platform admins or if no user
    if (!user || isPlatformAdmin) return;

    // Check for active impersonation sessions
    const checkActiveSession = async () => {
      const { data, error } = await supabase
        .from('admin_impersonation_log')
        .select(`
          *,
          admin_profile:admin_id (
            full_name,
            email
          )
        `)
        .eq('impersonated_user_id', user.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const adminProfile = data.admin_profile as any;
        setAlertState({
          isBeingViewed: true,
          adminName: adminProfile?.full_name || 'Platform Admin',
          adminEmail: adminProfile?.email || '',
          reason: data.reason || '',
          startedAt: data.started_at || '',
        });
      }
    };

    checkActiveSession();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('impersonation-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_impersonation_log',
          filter: `impersonated_user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch admin details
          const { data: adminData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payload.new.admin_id)
            .single();

          setAlertState({
            isBeingViewed: true,
            adminName: adminData?.full_name || 'Platform Admin',
            adminEmail: adminData?.email || '',
            reason: payload.new.reason,
            startedAt: payload.new.started_at,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_impersonation_log',
          filter: `impersonated_user_id=eq.${user.id}`,
        },
        (payload) => {
          // If ended_at is set, hide banner
          if (payload.new.ended_at) {
            setAlertState({
              isBeingViewed: false,
              adminName: '',
              adminEmail: '',
              reason: '',
              startedAt: '',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPlatformAdmin]);

  return alertState;
};

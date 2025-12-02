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
  const [alertState] = useState<ImpersonationAlertState>({
    isBeingViewed: false,
    adminName: '',
    adminEmail: '',
    reason: '',
    startedAt: '',
  });

  useEffect(() => {
    // Stub: admin_impersonation_log table does not exist
    console.log('useImpersonationAlert: Stubbed');
  }, [user, isPlatformAdmin]);

  return alertState;
};

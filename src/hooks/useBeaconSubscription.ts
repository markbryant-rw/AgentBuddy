import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';

export interface BeaconSubscription {
  creditsRemaining: number | 'unlimited';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'inactive' | 'unknown' | 'error';
  planName: string;
  licenseType: string | null;
  monthlyCredits?: number;
  creditResetDate?: string;
  error?: string;
}

export const useBeaconSubscription = () => {
  const { team } = useTeam();

  const { data: subscription, isLoading, error, refetch } = useQuery({
    queryKey: ['beacon-subscription', team?.id],
    queryFn: async (): Promise<BeaconSubscription> => {
      if (!team?.id) {
        return {
          creditsRemaining: 0,
          subscriptionStatus: 'inactive',
          planName: 'No Team',
          licenseType: null,
        };
      }

      // Fetch team's license_type directly from database
      const { data: teamData } = await supabase
        .from('teams')
        .select('license_type')
        .eq('id', team.id)
        .single();

      // Quick check for admin_unlimited teams - return immediately without API call
      if (teamData?.license_type === 'admin_unlimited') {
        return {
          creditsRemaining: 'unlimited',
          subscriptionStatus: 'active',
          planName: 'Founder Unlimited',
          licenseType: 'admin_unlimited',
        };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session');
      }

      const { data, error } = await supabase.functions.invoke('fetch-beacon-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error fetching beacon subscription:', error);
        throw error;
      }

      return data as BeaconSubscription;
    },
    enabled: !!team?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    subscription: subscription ?? {
      creditsRemaining: 0,
      subscriptionStatus: 'inactive' as const,
      planName: 'Not Connected',
      licenseType: null,
    },
    isLoading,
    error,
    refetch,
    isUnlimited: subscription?.creditsRemaining === 'unlimited',
    hasCredits: subscription?.creditsRemaining === 'unlimited' || (typeof subscription?.creditsRemaining === 'number' && subscription.creditsRemaining > 0),
  };
};

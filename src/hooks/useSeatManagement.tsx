import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { calculateTotalSeats, getPlanByProductId } from '@/lib/stripe-plans';

interface SeatInfo {
  currentMembers: number;
  maxSeats: number;
  availableSeats: number;
  canAddMember: boolean;
  isUnlimited: boolean;
  licenseType: string | null;
  extraSeats: number;
}

export function useSeatManagement() {
  const { user } = useAuth();
  const { team } = useTeam();
  const { subscription } = useUserSubscription();

  const { data: seatInfo, isLoading, refetch } = useQuery({
    queryKey: ['seat-management', team?.id, subscription?.plan],
    queryFn: async (): Promise<SeatInfo> => {
      if (!team?.id) {
        return {
          currentMembers: 0,
          maxSeats: 0,
          availableSeats: 0,
          canAddMember: false,
          isUnlimited: false,
          licenseType: null,
          extraSeats: 0,
        };
      }

      // Get team details with license info
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('license_type, extra_seats_purchased, subscription_owner_id')
        .eq('id', team.id)
        .single();

      if (teamError) {
        console.error('Error fetching team data:', teamError);
        throw teamError;
      }

      // Count current team members
      const { count: memberCount, error: countError } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);

      if (countError) {
        console.error('Error counting members:', countError);
        throw countError;
      }

      // Count pending invitations for this team
      const { count: pendingCount, error: pendingError } = await supabase
        .from('pending_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error counting pending invitations:', pendingError);
      }

      const licenseType = teamData?.license_type || 'standard';
      const extraSeats = teamData?.extra_seats_purchased || 0;
      const isUnlimited = licenseType === 'admin_unlimited';
      
      // Get plan from subscription
      const planId = subscription?.plan ? getPlanByProductId(subscription.productId || null) : null;
      
      const maxSeats = calculateTotalSeats(planId, extraSeats, licenseType);
      const currentMembers = (memberCount || 0) + (pendingCount || 0);
      const availableSeats = Math.max(0, maxSeats - currentMembers);

      return {
        currentMembers,
        maxSeats,
        availableSeats,
        canAddMember: isUnlimited || currentMembers < maxSeats,
        isUnlimited,
        licenseType,
        extraSeats,
      };
    },
    enabled: !!team?.id,
    staleTime: 30000,
  });

  return {
    seatInfo: seatInfo || {
      currentMembers: 0,
      maxSeats: 0,
      availableSeats: 0,
      canAddMember: false,
      isUnlimited: false,
      licenseType: null,
      extraSeats: 0,
    },
    isLoading,
    refetch,
  };
}
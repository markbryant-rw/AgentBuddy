import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTeamMembers } from './useTeamMembers';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced hook that guarantees the current user is always included in the assignable members list.
 * For users without a team (e.g., platform admins, solo agents), it fetches all users from their office.
 * This prevents dropdown rendering issues and ensures proper member selection.
 * 
 * Use this hook for any UI that needs to display/select team members (e.g., assignment dropdowns).
 */
import { logger } from "@/lib/logger";

export const useAssignableTeamMembers = () => {
  const { members, isLoading: teamMembersLoading } = useTeamMembers();
  const { team } = useTeam();
  const { user, isPlatformAdmin } = useAuth();

  // Fetch all office users for platform admins or users without a team
  const { data: officeUsers = [], isLoading: officeUsersLoading } = useQuery({
    queryKey: ['office-users-for-assignment', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's office
      const { data: profile } = await supabase
        .from('profiles')
        .select('office_id')
        .eq('id', user.id)
        .single();

      if (!profile?.office_id) return [];

      // Fetch all active users in the same office
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('office_id', profile.office_id)
        .eq('status', 'active');

      if (error) {
        console.error('[useAssignableTeamMembers] Error fetching office users:', error);
        return [];
      }

      // Map to match team member structure
      return users.map(u => ({
        user_id: u.id,
        full_name: u.full_name || u.email || 'Unknown',
        email: u.email || '',
        avatar_url: u.avatar_url,
        access_level: 'edit' as any,
      }));
    },
    enabled: !team && !!user, // Only fetch if no team context
  });

  const assignableMembers = useMemo(() => {
    if (!user) {
      logger.log('[useAssignableTeamMembers] No user found, returning empty array');
      return [];
    }

    // If there's a team, use team members; otherwise use office users
    const sourceList = team ? members : officeUsers;
    const base = Array.isArray(sourceList) ? [...sourceList] : [];
    
    logger.log('[useAssignableTeamMembers] Source:', {
      hasTeam: !!team,
      teamId: team?.id,
      sourceCount: sourceList.length,
      isPlatformAdmin,
    });
    
    // Check if current user is already in the list
    const hasSelf = base.some(m => m.user_id === user.id);
    
    if (!hasSelf) {
      logger.log('[useAssignableTeamMembers] Current user not in list, adding as fallback');
      // Add current user as a fallback option
      base.push({
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email || 'You',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        access_level: 'edit' as any,
      });
    }

    console.log('[useAssignableTeamMembers] Final assignable members:', {
      originalCount: sourceList.length,
      finalCount: base.length,
      userId: user.id,
      members: base.map(m => ({ id: m.user_id, name: m.full_name }))
    });

    return base;
  }, [members, officeUsers, user, team, isPlatformAdmin]);

  const isLoading = team ? teamMembersLoading : officeUsersLoading;

  return {
    assignableMembers,
    isLoading,
    hasTeamContext: !!team,
  };
};

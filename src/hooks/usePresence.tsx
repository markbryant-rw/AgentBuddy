import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { throttle } from '@/lib/queryClient';

type PresenceStatus = 'active' | 'away' | 'offline' | 'focus';

export const usePresence = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const [myPresence, setMyPresence] = useState<PresenceStatus>('active');
  const [allPresence, setAllPresence] = useState<Record<string, PresenceStatus>>({});

  // Update my presence status
  const updatePresence = useCallback(async (status: PresenceStatus) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        presence_status: status,
        last_active_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (!error) {
      setMyPresence(status);
    }
  }, [user]);

  // Track user activity (mouse, keyboard) - THROTTLED for performance
  useEffect(() => {
    if (!user) return;

    let activityTimeout: NodeJS.Timeout;
    
    // Throttle database updates to once every 30 seconds max
    const handleActivity = throttle(() => {
      clearTimeout(activityTimeout);
      
      // Update last_active_at (throttled to 30s)
      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      // Set to away after 15 mins of inactivity
      activityTimeout = setTimeout(() => {
        updatePresence('away');
      }, 15 * 60 * 1000);
    }, 30000); // 30 second throttle

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    handleActivity(); // Initial call

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [user, updatePresence]);

  // Subscribe to presence changes (TEAM-SCOPED for performance)
  useEffect(() => {
    if (!user || !team?.id) return;

    const channel = supabase
      .channel(`presence:team:${team.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `primary_team_id=eq.${team.id}`, // Only team members
      }, (payload) => {
        const { id, presence_status } = payload.new as any;
        setAllPresence(prev => ({ ...prev, [id]: presence_status }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, team?.id]);

  // Fetch initial presence for current user
  useEffect(() => {
    if (!user) return;

    const fetchMyPresence = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('presence_status')
        .eq('id', user.id)
        .single();
      
      if (data?.presence_status) {
        setMyPresence(data.presence_status as PresenceStatus);
      }
    };

    fetchMyPresence();
  }, [user]);

  // Set to active on mount, offline on unmount
  useEffect(() => {
    if (user) {
      updatePresence('active');
      
      return () => {
        updatePresence('offline');
      };
    }
  }, [user, updatePresence]);

  return {
    myPresence,
    updatePresence,
    allPresence,
  };
};

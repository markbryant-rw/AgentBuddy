import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PresenceUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export const useNotePresence = (noteId: string | undefined) => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  // Fetch active users
  const { data: presenceData } = useQuery({
    queryKey: ['note-presence', noteId],
    queryFn: async () => {
      if (!noteId) return [];

      const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
      
      const { data, error } = await supabase
        .from('note_presence')
        .select('user_id, profiles(id, full_name, email, avatar_url)')
        .eq('note_id', noteId)
        .gte('last_seen_at', fifteenSecondsAgo);

      if (error) throw error;

      return data
        .filter(p => p.profiles && p.user_id !== user?.id)
        .map(p => p.profiles as PresenceUser);
    },
    enabled: !!noteId && !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  useEffect(() => {
    if (presenceData) {
      setActiveUsers(presenceData);
    }
  }, [presenceData]);

  // Send heartbeat
  useEffect(() => {
    if (!noteId || !user) return;

    const updatePresence = async () => {
      await supabase
        .from('note_presence')
        .upsert({
          note_id: noteId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
        });
    };

    // Initial presence
    updatePresence();

    // Heartbeat every 2 seconds
    const interval = setInterval(updatePresence, 2000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from('note_presence')
        .delete()
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .then();
    };
  }, [noteId, user]);

  // Subscribe to realtime presence changes
  useEffect(() => {
    if (!noteId) return;

    const channel = supabase
      .channel(`note-presence-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_presence',
          filter: `note_id=eq.${noteId}`,
        },
        () => {
          // Refetch will happen automatically due to query refetchInterval
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  return {
    activeUsers,
  };
};

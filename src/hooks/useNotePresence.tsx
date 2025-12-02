import { useAuth } from './useAuth';

interface PresenceUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export const useNotePresence = (noteId: string | undefined) => {
  const { user } = useAuth();

  // Stub: note_presence table doesn't exist
  console.log('useNotePresence: Stubbed', { noteId, userId: user?.id });

  return {
    activeUsers: [] as PresenceUser[],
  };
};

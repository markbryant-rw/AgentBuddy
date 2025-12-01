import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NoteFriendSelectorProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (friendIds: string[]) => void;
}

interface Friend {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const NoteFriendSelector = ({
  noteId,
  open,
  onOpenChange,
  onSave,
}: NoteFriendSelectorProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  // Fetch user's friends
  const { data: friends = [] } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: connections } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id')
        .eq('accepted', true)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (!connections) return [];

      const friendIds = connections.map(conn =>
        conn.user_id === user.id ? conn.friend_id : conn.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', friendIds);

      return (profiles || []) as Friend[];
    },
    enabled: !!user && open,
  });

  // Fetch existing shares for this note
  const { data: existingShares = [] } = useQuery({
    queryKey: ['note-shares', noteId],
    queryFn: async () => {
      const { data } = await supabase
        .from('note_shares')
        .select('user_id')
        .eq('note_id', noteId);

      return data?.map(s => s.user_id) || [];
    },
    enabled: !!noteId && open,
  });

  // Initialize selected friends from existing shares
  useEffect(() => {
    if (existingShares.length > 0) {
      setSelectedFriendIds(new Set(existingShares));
    }
  }, [existingShares]);

  const filteredFriends = friends.filter(friend =>
    friend.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriendIds);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriendIds(newSelected);
  };

  const handleSave = () => {
    onSave(Array.from(selectedFriendIds));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Share with Friends
          </DialogTitle>
          <DialogDescription>
            Select which friends can view this note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Friends List */}
          <ScrollArea className="h-[300px] pr-4">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {friends.length === 0
                  ? 'No friends to share with'
                  : 'No friends match your search'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <Checkbox
                      checked={selectedFriendIds.has(friend.id)}
                      onCheckedChange={() => toggleFriend(friend.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.full_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {friend.full_name || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          {selectedFriendIds.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedFriendIds.size} friend{selectedFriendIds.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

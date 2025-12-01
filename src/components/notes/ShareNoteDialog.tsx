import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface ShareNoteDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareNoteDialog({ noteId, open, onOpenChange }: ShareNoteDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit'>('comment');

  // Fetch all users (with search)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-sharing', user?.id, searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .neq('id', user!.id)
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return profiles || [];
    },
    enabled: !!user && open && searchQuery.length >= 2,
  });

  // Get team member IDs to categorize users
  const { data: teamMemberIds = [] } = useQuery({
    queryKey: ['team-member-ids', user?.id],
    queryFn: async () => {
      const { data: myTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user!.id);

      if (!myTeams?.length) return [];

      const teamIds = myTeams.map(t => t.team_id);
      
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)
        .neq('user_id', user!.id);

      return members?.map(m => m.user_id) || [];
    },
    enabled: !!user && open,
  });

  // Fetch existing shares
  const { data: shares = [] } = useQuery({
    queryKey: ['note-shares', noteId],
    queryFn: async () => {
      const { data: shareData, error: sharesError } = await supabase
        .from('note_shares')
        .select('id, user_id, permission')
        .eq('note_id', noteId);

      if (sharesError || !shareData || shareData.length === 0) return [];

      const userIds = shareData.map(s => s.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      return shareData.map(s => ({
        ...s,
        profiles: profileMap[s.user_id],
      }));
    },
    enabled: open,
  });

  const createShare = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) return;

      const { error } = await supabase
        .from('note_shares')
        .insert({
          note_id: noteId,
          user_id: selectedUserId,
          permission,
          invited_by: user!.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
      setSelectedUserId(null);
      setSearchQuery('');
      toast.success('Note shared successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to share note');
    },
  });

  const removeShare = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from('note_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-shares', noteId] });
      toast.success('Access removed');
    },
  });

  // Separate team members and other users
  const availableUsers = allUsers.filter(
    (user: any) => !shares.some(s => s.user_id === user.id)
  );

  const teamMembers = availableUsers.filter((user: any) => 
    teamMemberIds.includes(user.id)
  );

  const otherUsers = availableUsers.filter((user: any) => 
    !teamMemberIds.includes(user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add people */}
          <div className="space-y-2">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchQuery && availableUsers.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {teamMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Team Members</p>
                    {teamMembers.map((member: any) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setSelectedUserId(member.id);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {(member.full_name || member.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.full_name || member.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Team</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {otherUsers.length > 0 && (
                  <div className={teamMembers.length > 0 ? 'pt-2 border-t' : ''}>
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Other Users</p>
                    {otherUsers.map((user: any) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {(user.full_name || user.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {searchQuery && searchQuery.length >= 2 && availableUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            )}

            {selectedUserId && (
              <div className="flex gap-2">
                <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Can View</SelectItem>
                    <SelectItem value="comment">Can Comment</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => createShare.mutate()} className="flex-1">
                  Share
                </Button>
              </div>
            )}
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium">People with access</p>
              {shares.map((share: any) => (
                <div key={share.id} className="flex items-center gap-2 p-2 rounded-md border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={share.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(share.profiles?.full_name || share.profiles?.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {share.profiles?.full_name || share.profiles?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {share.permission === 'view' ? 'Can view' : share.permission === 'comment' ? 'Can comment' : 'Can edit'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeShare.mutate(share.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

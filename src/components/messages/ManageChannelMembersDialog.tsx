import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserMinus, Crown, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ManageChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function ManageChannelMembersDialog({ open, onOpenChange, conversationId }: ManageChannelMembersDialogProps) {
  const { user } = useAuth();
  const { removeMember, updateMemberPermissions } = useChannelManagement();

  const { data: conversation } = useQuery({
    queryKey: ["conversation-details", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("created_by")
        .eq("id", conversationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: participants = [], refetch } = useQuery({
    queryKey: ["channel-participants", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq("conversation_id", conversationId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const isCreator = conversation?.created_by === user?.id;

  const handleRemoveMember = async (userId: string) => {
    await removeMember({ conversationId, userId });
    refetch();
  };

  const handleToggleCanPost = async (userId: string, currentCanPost: boolean) => {
    await updateMemberPermissions({ conversationId, userId, canPost: !currentCanPost });
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {participants.map((participant: any) => {
            const profile = participant.profiles;
            const isOwner = participant.user_id === conversation?.created_by;
            const isSelf = participant.user_id === user?.id;

            return (
              <div key={participant.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {profile?.full_name || profile?.email}
                      </p>
                      {isOwner && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Creator
                        </Badge>
                      )}
                      {isSelf && <Badge variant="outline">You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isCreator && !isOwner && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`can-post-${participant.id}`} className="text-xs cursor-pointer">
                          Can post
                        </Label>
                        <Switch
                          id={`can-post-${participant.id}`}
                          checked={participant.can_post}
                          onCheckedChange={() => handleToggleCanPost(participant.user_id, participant.can_post)}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {profile?.full_name || profile?.email} from this channel?
                              They will no longer be able to see messages or participate.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(participant.user_id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

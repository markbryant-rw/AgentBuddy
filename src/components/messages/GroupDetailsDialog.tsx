import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserPlus, Edit, Bell, BellOff, LogOut, Crown, Shield, MoreVertical, UserMinus } from "lucide-react";
import { AddChannelMemberDialog } from "./AddChannelMemberDialog";
import { EditChannelDialog } from "./EditChannelDialog";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { toast } from "sonner";

interface GroupDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export const GroupDetailsDialog = ({
  open,
  onOpenChange,
  conversationId,
}: GroupDetailsDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { muteConversation, updateMemberAdminStatus, removeMember, leaveGroup } = useChannelManagement();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ["conversation-details", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, created_by, icon, title, description, allow_member_invites")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!conversationId,
  });

  // Fetch participants with admin status
  const { data: participants, refetch: refetchParticipants } = useQuery({
    queryKey: ["channel-participants", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select(
          `
          user_id,
          muted,
          can_post,
          is_admin,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `
        )
        .eq("conversation_id", conversationId);

      if (error) throw error;
      return data;
    },
    enabled: open && !!conversationId,
  });

  const isCreator = conversation?.created_by === user?.id;
  const currentUserParticipant = participants?.find((p) => p.user_id === user?.id);
  const isMuted = currentUserParticipant?.muted || false;
  const isAdmin = currentUserParticipant?.is_admin || false;
  const canManageMembers = isCreator || isAdmin;

  const handleToggleMute = async () => {
    try {
      await muteConversation({ conversationId, muted: !isMuted });
      toast.success(isMuted ? "Unmuted" : "Muted");
      refetchParticipants();
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    try {
      await updateMemberAdminStatus({ conversationId, userId, isAdmin: makeAdmin });
      refetchParticipants();
    } catch (error) {
      console.error("Failed to update admin status:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember({ conversationId, userId });
      refetchParticipants();
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    try {
      await leaveGroup({ conversationId, userId: user.id });
      onOpenChange(false);
      navigate("/messages");
    } catch (error) {
      // Error toast is handled by the mutation
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Group Info Section */}
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="text-5xl">{conversation?.icon || "💬"}</div>
              <div>
                <h3 className="text-lg font-semibold">{conversation?.title}</h3>
                {conversation?.description && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    {conversation.description}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {participants?.length || 0} {participants?.length === 1 ? "member" : "members"}
              </p>
            </div>

            <Separator />

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Members</h4>
                {(canManageMembers || conversation?.allow_member_invites) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMembers(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {participants?.map((participant) => {
                    const profile = participant.profiles as any;
                    const isCreatorUser = conversation?.created_by === participant.user_id;
                    const isMemberAdmin = participant.is_admin;

                    return (
                      <div
                        key={participant.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(profile?.full_name || profile?.email || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {profile?.full_name || profile?.email}
                            {participant.user_id === user?.id && (
                              <span className="text-muted-foreground"> (You)</span>
                            )}
                          </p>
                          <div className="flex gap-1 mt-0.5">
                            {isCreatorUser && (
                              <Badge variant="default" className="text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                Creator
                              </Badge>
                            )}
                            {isMemberAdmin && !isCreatorUser && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        </div>

                        {canManageMembers && !isCreatorUser && participant.user_id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleAdmin(participant.user_id, !isMemberAdmin)}>
                                {isMemberAdmin ? (
                                  <>
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remove admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleRemoveMember(participant.user_id)}
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Actions Section */}
            <div className="space-y-2">
              {isCreator && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowEditGroup(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Group Info
                </Button>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  {isMuted ? (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="mute-toggle" className="cursor-pointer">
                    Mute Notifications
                  </Label>
                </div>
                <Switch
                  id="mute-toggle"
                  checked={isMuted}
                  onCheckedChange={handleToggleMute}
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave this group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isCreator 
                        ? "As the creator, you must promote at least one other member to admin before leaving."
                        : `Are you sure you want to leave "${conversation?.title}"? You'll no longer receive messages from this group.`
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleLeaveGroup}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Leave Group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <AddChannelMemberDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        conversationId={conversationId}
      />

      {conversation && (
        <EditChannelDialog
          open={showEditGroup}
          onOpenChange={setShowEditGroup}
          conversationId={conversationId}
          currentTitle={conversation.title || ""}
          currentIcon={conversation.icon}
          currentDescription={conversation.description}
          currentAllowMemberInvites={conversation.allow_member_invites}
          createdBy={conversation.created_by}
        />
      )}
    </>
  );
};
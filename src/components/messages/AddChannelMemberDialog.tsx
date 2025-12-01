import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserPlus, Search } from "lucide-react";

interface AddChannelMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function AddChannelMemberDialog({
  open,
  onOpenChange,
  conversationId,
}: AddChannelMemberDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch conversation details and current user's participant info
  const { data: conversationData } = useQuery({
    queryKey: ["conversation-permissions", conversationId],
    queryFn: async () => {
      const [convResult, participantResult] = await Promise.all([
        supabase
          .from("conversations")
          .select("created_by, allow_member_invites")
          .eq("id", conversationId)
          .single(),
        supabase
          .from("conversation_participants")
          .select("is_admin")
          .eq("conversation_id", conversationId)
          .eq("user_id", user?.id)
          .single()
      ]);

      if (convResult.error) throw convResult.error;
      
      return {
        conversation: convResult.data,
        isAdmin: participantResult.data?.is_admin || false
      };
    },
    enabled: open && !!conversationId && !!user,
  });

  const isCreator = conversationData?.conversation?.created_by === user?.id;
  const isAdmin = conversationData?.isAdmin || false;
  const allowMemberInvites = conversationData?.conversation?.allow_member_invites || false;
  const canAddMembers = isCreator || isAdmin || allowMemberInvites;

  // Search for users (team members + friends)
  const { data: searchResults = [] } = useQuery({
    queryKey: ["user-search", searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2 && canAddMembers,
  });

  // Get existing participants to filter them out
  const { data: existingParticipants = [] } = useQuery({
    queryKey: ["conversation-participants", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);
      
      if (error) throw error;
      return data.map(p => p.user_id);
    },
    enabled: open,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("add_channel_participant", {
        channel_id: conversationId,
        new_user_id: userId,
        allow_posting: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversation-participants", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["channel-participants", conversationId] });
      toast.success("Member added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add member");
      console.error(error);
    },
  });

  const availableUsers = searchResults.filter(
    user => !existingParticipants.includes(user.id)
  );

  if (!canAddMembers) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members to Channel</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Only admins can add members to this group.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {searchTerm.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Type at least 2 characters to search
              </p>
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full" />
                      ) : (
                        <span className="text-sm font-medium">
                          {user.full_name?.[0] || user.email[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addMemberMutation.mutate(user.id)}
                    disabled={addMemberMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
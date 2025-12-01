import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { toast } from "sonner";

interface CreateChannelParams {
  title: string;
  channelType: "standard" | "announcement";
  icon?: string;
}

export function useChannelManagement() {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  const createChannelMutation = useMutation({
    mutationFn: async ({ title, channelType, icon }: CreateChannelParams) => {
      if (!user) throw new Error("Authentication required");

      // Use server-side function to create channel (handles RLS with auth.uid())
      const { data: conversationId, error } = await supabase.rpc("create_team_channel", {
        channel_title: title,
        channel_type: channelType,
        channel_icon: icon || null,
      });

      if (error) throw error;

      if (typeof conversationId !== 'string') {
        throw new Error('Expected RPC to return a conversation ID string');
      }

      return conversationId;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Channel created successfully");
      return conversationId;
    },
    onError: (error: Error) => {
      console.error("Failed to create channel:", error);
      toast.error(error.message || "Failed to create channel");
    },
  });

  const muteConversationMutation = useMutation({
    mutationFn: async ({ conversationId, muted }: { conversationId: string; muted: boolean }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversation_participants")
        .update({ muted })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      console.error("Failed to update mute status:", error);
      toast.error("Failed to update mute status");
    },
  });

  const updateChannelNameMutation = useMutation({
    mutationFn: async ({ conversationId, title }: { conversationId: string; title: string }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId)
        .eq("created_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-details"] });
      toast.success("Channel name updated");
    },
    onError: (error) => {
      console.error("Failed to update channel name:", error);
      toast.error("Failed to update channel name");
    },
  });

  const updateChannelIconMutation = useMutation({
    mutationFn: async ({ conversationId, icon }: { conversationId: string; icon: string }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversations")
        .update({ icon })
        .eq("id", conversationId)
        .eq("created_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-details"] });
      toast.success("Channel icon updated");
    },
    onError: (error) => {
      console.error("Failed to update channel icon:", error);
      toast.error("Failed to update channel icon");
    },
  });

  const updateChannelDescriptionMutation = useMutation({
    mutationFn: async ({ conversationId, description }: { conversationId: string; description: string }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversations")
        .update({ description })
        .eq("id", conversationId)
        .eq("created_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-details"] });
      toast.success("Description updated");
    },
    onError: (error) => {
      console.error("Failed to update channel description:", error);
      toast.error("Failed to update channel description");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-participants"] });
      toast.success("Member removed");
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    },
  });

  const updateMemberPermissionsMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      userId, 
      canPost 
    }: { 
      conversationId: string; 
      userId: string; 
      canPost: boolean;
    }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversation_participants")
        .update({ can_post: canPost })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-participants"] });
      toast.success("Permissions updated");
    },
    onError: (error) => {
      console.error("Failed to update permissions:", error);
      toast.error("Failed to update permissions");
    },
  });

  const updateMemberAdminStatusMutation = useMutation({
    mutationFn: async ({ conversationId, userId, isAdmin }: { conversationId: string; userId: string; isAdmin: boolean }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversation_participants")
        .update({ is_admin: isAdmin })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-participants"] });
      toast.success("Admin status updated");
    },
    onError: (error) => {
      console.error("Failed to update admin status:", error);
      toast.error("Failed to update admin status");
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (!user) throw new Error("User not found");

      // Check if user is creator
      const { data: conversation, error: fetchError } = await supabase
        .from("conversations")
        .select("created_by")
        .eq("id", conversationId)
        .single();

      if (fetchError) throw fetchError;

      const isCreator = conversation.created_by === userId;

      if (isCreator) {
        // Count other admins
        const { data: otherAdmins, error: adminError } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .eq("is_admin", true)
          .neq("user_id", userId);

        if (adminError) throw adminError;

        if (!otherAdmins || otherAdmins.length === 0) {
          throw new Error("You must promote at least one other member to admin before leaving");
        }
      }

      // Remove user from conversation
      const { error } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["channel-participants"] });
      toast.success("Left group");
    },
    onError: (error) => {
      console.error("Failed to leave group:", error);
      toast.error(error.message || "Failed to leave group");
    },
  });

  const updateGroupSettingsMutation = useMutation({
    mutationFn: async ({ conversationId, allowMemberInvites }: { conversationId: string; allowMemberInvites: boolean }) => {
      if (!user) throw new Error("User not found");

      const { error } = await supabase
        .from("conversations")
        .update({ allow_member_invites: allowMemberInvites })
        .eq("id", conversationId)
        .eq("created_by", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-details"] });
      toast.success("Group settings updated");
    },
    onError: (error) => {
      console.error("Failed to update group settings:", error);
      toast.error("Failed to update group settings");
    },
  });

  return {
    createChannel: createChannelMutation.mutateAsync,
    isCreating: createChannelMutation.isPending,
    muteConversation: muteConversationMutation.mutateAsync,
    isMuting: muteConversationMutation.isPending,
    updateChannelName: updateChannelNameMutation.mutateAsync,
    updateChannelIcon: updateChannelIconMutation.mutateAsync,
    updateChannelDescription: updateChannelDescriptionMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    updateMemberPermissions: updateMemberPermissionsMutation.mutateAsync,
    updateMemberAdminStatus: updateMemberAdminStatusMutation.mutateAsync,
    leaveGroup: leaveGroupMutation.mutateAsync,
    updateGroupSettings: updateGroupSettingsMutation.mutateAsync,
  };
}

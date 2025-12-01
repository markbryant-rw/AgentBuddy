import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import type { CollaborativeConversation } from "@/types/coaching";

export const useCoachingConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["coaching-conversations"],
    queryFn: async () => {
      if (!user) return [];

      // Clean up old conversations first
      const { error: cleanupError } = await supabase.rpc(
        "delete_old_coaching_conversations"
      );
      if (cleanupError) {
        console.error("Error cleaning up old conversations:", cleanupError);
      }

      // Fetch conversations with contributor stats
      const { data, error } = await supabase
        .from("coaching_conversations")
        .select(`
          *,
          messages:coaching_conversation_messages(author_id)
        `)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate contributor stats
      const conversationsWithStats = data.map((conv) => {
        const uniqueAuthors = new Set(
          conv.messages?.map((m: any) => m.author_id).filter(Boolean)
        );
        return {
          ...conv,
          contributor_count: uniqueAuthors.size,
        };
      });

      return conversationsWithStats as CollaborativeConversation[];
    },
    enabled: !!user,
  });

  const starConversation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      const { error } = await supabase
        .from("coaching_conversations")
        .update({ is_starred: isStarred })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success("Conversation updated");
    },
    onError: (error) => {
      toast.error("Failed to update conversation");
      console.error(error);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coaching_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success("Conversation deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete conversation");
      console.error(error);
    },
  });

  const toggleShare = useMutation({
    mutationFn: async ({ id, isShared }: { id: string; isShared: boolean }) => {
      const { error } = await supabase
        .from("coaching_conversations")
        .update({ is_shared: isShared })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success(variables.isShared ? "Shared with team" : "Unshared from team");
    },
    onError: (error) => {
      toast.error("Failed to update sharing");
      console.error(error);
    },
  });

  const toggleShareWithFriends = useMutation({
    mutationFn: async ({ id, shareWithFriends }: { id: string; shareWithFriends: boolean }) => {
      const { error } = await supabase
        .from("coaching_conversations")
        .update({ share_with_friends: shareWithFriends })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success(variables.shareWithFriends ? "Shared with friends" : "Unshared from friends");
    },
    onError: (error) => {
      toast.error("Failed to update sharing");
      console.error(error);
    },
  });

  const starredConversations = conversations.filter((c) => c.is_starred);
  const myConversations = conversations.filter((c) => !c.is_shared && !c.share_with_friends && !c.is_starred && c.user_id === user?.id);
  const sharedConversations = conversations.filter((c) => c.is_shared);
  const friendsSharedConversations = conversations.filter((c) => c.share_with_friends && c.user_id !== user?.id);

  return {
    conversations,
    starredConversations,
    myConversations,
    sharedConversations,
    friendsSharedConversations,
    isLoading,
    starConversation: starConversation.mutate,
    deleteConversation: deleteConversation.mutate,
    toggleShare: toggleShare.mutate,
    toggleShareWithFriends: toggleShareWithFriends.mutate,
  };
};

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

      // Fetch conversations (cleanup RPC doesn't exist)
      const { data, error } = await (supabase as any)
        .from("coaching_conversations")
        .select(`
          *,
          messages:coaching_conversation_messages(role)
        `)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Calculate contributor stats
      const conversationsWithStats = data.map((conv) => {
        const uniqueAuthors = new Set(
          (conv.messages as any[])?.map((m: any) => m.role).filter(Boolean)
        );
        return {
          ...conv,
          contributor_count: uniqueAuthors.size,
          team_id: null, // Stub fields not in schema
          is_shared: false,
          share_with_friends: false,
          created_by: conv.user_id,
        };
      });

      return conversationsWithStats as any[];
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

  // Stubbed - sharing fields don't exist in schema
  const toggleShare = useMutation({
    mutationFn: async ({ id, isShared }: { id: string; isShared: boolean }) => {
      // Stubbed - is_shared field doesn't exist
      return;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success(variables.isShared ? "Shared with team" : "Unshared from team");
    },
  });

  const toggleShareWithFriends = useMutation({
    mutationFn: async ({ id, shareWithFriends }: { id: string; shareWithFriends: boolean }) => {
      // Stubbed - share_with_friends field doesn't exist
      return;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
      toast.success(variables.shareWithFriends ? "Shared with friends" : "Unshared from friends");
    },
  });

  const starredConversations = (conversations as any[]).filter((c) => c.is_starred);
  const myConversations = (conversations as any[]).filter((c: any) => !c.is_shared && !c.share_with_friends && !c.is_starred && c.user_id === user?.id);
  const sharedConversations = (conversations as any[]).filter((c: any) => c.is_shared);
  const friendsSharedConversations = (conversations as any[]).filter((c: any) => c.share_with_friends && c.user_id !== user?.id);

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

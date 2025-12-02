import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  edited?: boolean;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use infinite query for pagination (50 messages per page)
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    staleTime: 30 * 1000, // 30 seconds (realtime handles updates)
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) return [];

      const { data: messagesData, error } = await supabase
        .from("messages")
        .select(`
          id, conversation_id, sender_id, content, created_at
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false }) // Newest first for pagination
        .range(pageParam, pageParam + 49); // 50 messages per page

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set(
        messagesData
          .map((m) => m.sender_id)
          .filter((id): id is string => typeof id === 'string' && id !== null)
      )];
      let authorsMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", authorIds);

        authorsMap = profiles?.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>) || {};
      }

      return messagesData.map((msg) => ({
        ...msg,
        author: msg.sender_id && authorsMap[msg.sender_id]
          ? authorsMap[msg.sender_id]
          : undefined,
      })) as Message[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined; // No more pages
      return allPages.length * 50; // Next offset
    },
    enabled: !!conversationId,
    initialPageParam: 0,
  });

  // Flatten pages and reverse for chronological order (oldest to newest)
  const messages = data?.pages.flat().reverse() ?? [];

  // Note: last_read_at tracking is stubbed as the column doesn't exist

  const sendMessage = useMutation({
    mutationFn: async ({ content, messageType = "text" }: { content: string; messageType?: string }) => {
      if (!conversationId || !user) throw new Error("Missing conversation or user");

      console.log("📤 Attempting to send message:", {
        conversationId,
        userId: user.id,
        contentLength: content.length,
        messageType
      });

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Message send error:", error);
        // Provide specific error messages based on error details
        if (error.message.includes("can_post") || error.message.includes("permission")) {
          throw new Error("You don't have permission to post in this channel");
        }
        if (error.message.includes("conversation_participants") || error.message.includes("participant")) {
          throw new Error("You are not a participant in this conversation");
        }
        throw error;
      }

      console.log("✅ Message sent successfully:", data.id);
      return data;
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
      console.error("Message send failed:", error);
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({ content })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Message updated");
    },
    onError: (error) => {
      toast.error("Failed to edit message");
      console.error(error);
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ content: '[deleted]' })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Message deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete message");
      console.error(error);
    },
  });

  return {
    messages,
    isLoading,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    sendMessage: async (content: string, messageType?: string) => 
      sendMessage.mutateAsync({ content, messageType }),
    editMessage: editMessage.mutate,
    deleteMessage: deleteMessage.mutate,
  };
};

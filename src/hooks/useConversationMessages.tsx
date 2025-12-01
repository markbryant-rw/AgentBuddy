import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import type { ConversationMessage } from "@/types/coaching";

export const useConversationMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Optimized query with JOIN to fetch messages and authors in a single request
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data: messagesData, error } = await supabase
        .from("coaching_conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author profiles in a single query for better performance
      const authorIds = [...new Set(messagesData.map(m => m.author_id).filter(Boolean))];
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
        author: msg.author_id && authorsMap[msg.author_id]
          ? authorsMap[msg.author_id]
          : undefined,
      })) as ConversationMessage[];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coaching_conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the message
          const { data: messageData } = await supabase
            .from("coaching_conversation_messages")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (messageData) {
            // Fetch author profile if exists
            let author = undefined;
            if (messageData.author_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, email")
                .eq("id", messageData.author_id)
                .single();
              author = profile || undefined;
            }

            const newMessage = {
              ...messageData,
              author,
            } as ConversationMessage;

            queryClient.setQueryData(
              ["conversation-messages", conversationId],
              (old: ConversationMessage[] = []) => [...old, newMessage]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const addMessage = useMutation({
    mutationFn: async ({
      role,
      content,
    }: {
      role: "user" | "assistant";
      content: string;
    }) => {
      if (!conversationId || !user) throw new Error("No conversation or user");

      const { data, error } = await supabase
        .from("coaching_conversation_messages")
        .insert({
          conversation_id: conversationId,
          role,
          content,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error("Failed to add message");
      console.error(error);
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("coaching_conversation_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", conversationId],
      });
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
    addMessage: addMessage.mutateAsync,
    deleteMessage: deleteMessage.mutate,
  };
};

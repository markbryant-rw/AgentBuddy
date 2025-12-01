import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { toast } from "sonner";
import { preloadConversationAvatars } from "@/lib/imagePreloader";

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  created_by: string | null;
  last_message_at: string;
  archived: boolean;
  channel_type?: 'standard' | 'announcement';
  is_system_channel?: boolean;
  icon?: string | null;
  participants: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  }>;
  last_message?: {
    content: string;
    created_at: string;
    author_id: string;
  };
  unread_count: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    staleTime: 2 * 60 * 1000, // 2 minutes (realtime handles updates)
    queryFn: async () => {
      if (!user) return [];

      // ✅ OPTIMIZED: Single query using materialized view
      const { data, error } = await supabase
        .from("user_conversations_summary")
        .select("*")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      // Data is already formatted by the view
      const conversations = (data || []).map((conv) => ({
        id: conv.conversation_id,
        type: conv.type as 'direct' | 'group',
        title: conv.title,
        created_by: conv.created_by,
        last_message_at: conv.last_message_at,
        archived: conv.archived,
        channel_type: conv.channel_type,
        is_system_channel: conv.is_system_channel,
        icon: conv.icon,
        participants: conv.participants || [],
        last_message: conv.last_message || undefined,
        unread_count: conv.unread_count || 0,
      })) as Conversation[];

      // Preload conversation avatars for instant display
      const avatarUrls = conversations
        .flatMap(conv => conv.participants.map(p => p.avatar_url))
        .filter((url): url is string => !!url);
      
      if (avatarUrls.length > 0) {
        preloadConversationAvatars(avatarUrls);
      }

      return conversations;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createDirectConversation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
        user1_id: user.id,
        user2_id: targetUserId,
      });

      if (error) throw error;

      if (typeof data !== 'string') {
        throw new Error('Expected RPC to return a conversation ID string');
      }

      return data;
    },
    onSuccess: (conversationId) => {
      // Invalidate but don't wait for refetch - return immediately
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      return conversationId;
    },
    onError: (error) => {
      toast.error("Failed to create conversation");
      console.error(error);
    },
  });

  const createGroupConversation = useMutation({
    mutationFn: async ({ title, participantIds }: { title: string; participantIds: string[] }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          title,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all participants including creator
      const allParticipants = [user.id, ...participantIds];
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(
          allParticipants.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
          }))
        );

      if (participantsError) throw participantsError;

      return conversation.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Group conversation created");
    },
    onError: (error) => {
      toast.error("Failed to create group conversation");
      console.error(error);
    },
  });

  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ archived: true })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation archived");
    },
    onError: (error) => {
      toast.error("Failed to archive conversation");
      console.error(error);
    },
  });

  return {
    conversations,
    isLoading,
    createDirectConversation: createDirectConversation.mutateAsync,
    createGroupConversation: createGroupConversation.mutateAsync,
    archiveConversation: archiveConversation.mutate,
  };
};

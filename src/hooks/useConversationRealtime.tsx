import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
  is_typing?: boolean;
}

interface TypingUser {
  userId: string;
  userName: string;
}

interface Message {
  id: string;
  conversation_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  edited: boolean;
  deleted: boolean;
  message_type: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

/**
 * Consolidated realtime hook - manages single channel for:
 * - Postgres changes (messages)
 * - Broadcast events (typing indicators)
 * - Presence tracking (online users)
 */
export const useConversationRealtime = (conversationId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      setTypingUsers([]);
      setPresenceUsers([]);
      return;
    }

    // Single consolidated channel for all realtime events
    const realtimeChannel = supabase.channel(`conversation:${conversationId}:all`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // === POSTGRES CHANGES (Messages) ===
    realtimeChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, created_at, reactions")
            .eq("id", payload.new.id)
            .single();

          if (messageError) {
            console.error('Error fetching message:', messageError);
            return;
          }

          if (!messageData) {
            console.error('Message not found:', payload.new.id);
            return;
          }

          // Fetch sender profile if exists
          let author = undefined;
          if (messageData.sender_id) {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, email")
              .eq("id", messageData.sender_id)
              .single();

            if (!profileError && profile) {
              author = profile;
            }
          }

          const newMessage = {
            ...messageData,
            author_id: messageData.sender_id,
            author,
            updated_at: messageData.created_at,
            edited: false,
            deleted: false,
            message_type: 'standard',
          } as Message;

          queryClient.setQueryData(
            ["messages", conversationId],
            (old: any) => {
              if (!old) return { pages: [[newMessage]], pageParams: [0] };
              const newPages = [...old.pages];
              newPages[newPages.length - 1] = [...newPages[newPages.length - 1], newMessage];
              return { ...old, pages: newPages };
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      );

    // === BROADCAST (Typing Indicators) ===
    realtimeChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === payload.userId)) return prev;
            return [...prev, { userId: payload.userId, userName: payload.userName }];
          });

          // Auto-remove after 4 seconds
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
          }, 4000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
      });

    // === PRESENCE (Online Users) ===
    realtimeChannel
      .on("presence", { event: "sync" }, () => {
        const state = realtimeChannel.presenceState();
        const users: PresenceUser[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            if (presence.user_id) {
              users.push(presence as PresenceUser);
            }
          }
        });

        setPresenceUsers(users.filter((u) => u.user_id !== user.id));
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      });

    // Subscribe and track presence
    realtimeChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Fetch user profile for presence
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile for presence:', profileError);
        }

        await realtimeChannel.track({
          user_id: user.id,
          full_name: profile?.full_name || "Unknown User",
          avatar_url: profile?.avatar_url || null,
          online_at: new Date().toISOString(),
          is_typing: false,
        });
      }
    });

    setChannel(realtimeChannel);

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      supabase.removeChannel(realtimeChannel);
    };
  }, [conversationId, user, queryClient]);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    if (!user || !channel) return;

    channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: user.id,
        userName: user.user_metadata?.full_name || user.email,
      },
    });

    // Clear existing timeout using functional update
    setTypingTimeout(prev => {
      if (prev) clearTimeout(prev);
      return null;
    });

    // Stop broadcasting after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      channel.send({
        type: "broadcast",
        event: "stop_typing",
        payload: { userId: user.id },
      });
    }, 3000);

    setTypingTimeout(timeout);
  }, [user, channel]);

  // Update typing status in presence
  const updateTypingStatus = useCallback(
    async (isTyping: boolean) => {
      if (!channel || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile for typing status:', profileError);
      }

      await channel.track({
        user_id: user.id,
        full_name: profile?.full_name || "Unknown User",
        avatar_url: profile?.avatar_url || null,
        online_at: new Date().toISOString(),
        is_typing: isTyping,
      });
    },
    [channel, user]
  );

  const typingUsersList = presenceUsers.filter((u) => u.is_typing);

  return {
    presenceUsers,
    typingUsers,
    typingUsersList, // From presence system
    broadcastTyping,
    updateTypingStatus,
  };
};

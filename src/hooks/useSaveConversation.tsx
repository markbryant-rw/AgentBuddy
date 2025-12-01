import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const useSaveConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveConversation = useMutation({
    mutationFn: async ({
      conversationId,
      messages,
      teamId,
    }: {
      conversationId: string | null;
      messages: Message[];
      teamId?: string | null;
    }) => {
      if (!user || messages.length === 0) return null;

      // Generate title from first user message
      const firstUserMessage = messages.find((m) => m.role === "user");
      const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 50) +
          (firstUserMessage.content.length > 50 ? "..." : "")
        : "Untitled Conversation";

      if (conversationId) {
        // Update existing conversation title and timestamp
        // Messages are handled separately by the component via real-time subscriptions
        const { data: convData, error: convError } = await supabase
          .from("coaching_conversations")
          .update({
            title,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .select()
          .single();

        if (convError) throw convError;
        return convData;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("coaching_conversations")
          .insert({
            user_id: user.id,
            team_id: teamId,
            title,
            created_by: user.id,
          })
          .select()
          .single();

        if (convError) throw convError;

        // Insert messages
        const messagesToInsert = messages.map((m) => ({
          conversation_id: newConv.id,
          role: m.role,
          content: m.content,
          author_id: user.id,
        }));

        const { error: messagesError } = await supabase
          .from("coaching_conversation_messages")
          .insert(messagesToInsert);

        if (messagesError) throw messagesError;

        return newConv;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-conversations"] });
    },
    onError: (error) => {
      toast.error("Failed to save conversation");
      console.error(error);
    },
  });

  return {
    saveConversation: saveConversation.mutateAsync,
    isSaving: saveConversation.isPending,
  };
};

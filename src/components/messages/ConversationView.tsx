import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationHeader } from "./ConversationHeader";
import { ChannelHeader } from "./ChannelHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { TypingIndicator } from "../TypingIndicator";
import { EmptyState } from "./EmptyState";
import { format, isSameDay } from "date-fns";
import { Loader2, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ConversationViewProps {
  conversationId: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ConversationView({ conversationId, onBack, showBackButton }: ConversationViewProps) {
  const { messages, isLoading, loadMore, hasMore, isLoadingMore, sendMessage } = useMessages(conversationId);
  const { user } = useAuth();
  const { typingUsers, broadcastTyping } = useConversationRealtime(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Fetch conversation details to determine if it's a channel
  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const isChannel = conversation?.type === "group";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const groupedMessages = messages.reduce((groups, message, index) => {
    const messageDate = new Date(message.created_at);
    const dateKey = format(messageDate, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push({ ...message, showAvatar: true });
    
    return groups;
  }, {} as Record<string, any[]>);

  const handleSendMessage = async (content: string, messageType?: string) => {
    return await sendMessage(content, messageType);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isChannel ? (
        <ChannelHeader 
          conversationId={conversationId} 
          onBack={onBack}
          showBackButton={showBackButton}
        />
      ) : (
        <ConversationHeader 
          conversationId={conversationId}
          onBack={onBack}
          showBackButton={showBackButton}
        />
      )}

      <div className="flex-1 overflow-y-auto px-6" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-violet-500" />
            </motion.div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState 
            type="no-messages" 
            userName={conversation?.title || undefined}
            onAction={(suggestion) => {
              if (typeof suggestion === 'string') {
                handleSendMessage(suggestion);
              }
            }}
          />
        ) : (
          <div className="space-y-6">
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pb-2" ref={topRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore()}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      Load More
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div key={dateKey}>
                {/* Date Divider */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center my-6"
                >
                  <div className="bg-muted/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-border shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      {isSameDay(new Date(dateKey), new Date())
                        ? 'Today'
                        : format(new Date(dateKey), 'MMMM d, yyyy')}
                    </span>
                  </div>
                </motion.div>

                {/* Messages */}
                <AnimatePresence mode="popLayout">
                  <div className="space-y-4">
                    {dateMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.author_id === user?.id}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {typingUsers.length > 0 && (
        <TypingIndicator 
          users={typingUsers.map(({ userId, userName }) => ({
            user_id: userId,
            full_name: userName,
            online_at: new Date().toISOString(),
          }))} 
        />
      )}

      <MessageInput 
        onSend={handleSendMessage} 
        conversationId={conversationId}
        onTyping={broadcastTyping}
      />
    </div>
  );
}

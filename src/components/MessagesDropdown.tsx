import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, ArrowLeft, Send, Loader2 } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageBubble } from "./messages/MessageBubble";
import { cn } from "@/lib/utils";

// Helper to get display name from participant
const getPersonDisplayName = (participant: { full_name: string | null; email: string }) => {
  if (participant.full_name) return participant.full_name;

  if (participant.email) {
    const emailPart = participant.email.split("@")[0];
    const nameParts = emailPart.split(/[._-]/);
    if (nameParts.length >= 2) {
      return nameParts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    }
    return emailPart;
  }

  return "Team Member";
};

export const MessagesDropdown = () => {
  const { conversations, isLoading } = useConversations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate total unread count
  const unreadCount = conversations.reduce((total, conv) => total + conv.unread_count, 0);

  // Get recent conversations (limit to 6)
  const recentConversations = conversations.slice(0, 6);

  // Active conversation hooks (only when a conversation is selected)
  const { messages, isLoading: messagesLoading, loadMore, hasMore, isLoadingMore, sendMessage } = useMessages(activeConversationId);
  const { typingUsers, broadcastTyping } = useConversationRealtime(activeConversationId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && activeConversationId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeConversationId]);

  // Get conversation display info
  const getConversationDisplay = (conv: typeof conversations[0]) => {
    if (conv.type === 'group') {
      return {
        displayName: conv.title || 'Group Chat',
        avatarUrl: conv.icon || null,
        initials: conv.title?.[0]?.toUpperCase() || 'G',
      };
    }

    const otherParticipant = conv.participants.find(p => p.id !== user?.id);

    if (!otherParticipant) {
      return {
        displayName: "Team Member",
        avatarUrl: null,
        initials: "T",
      };
    }

    const displayName = getPersonDisplayName(otherParticipant);

    return {
      displayName,
      avatarUrl: otherParticipant.avatar_url || null,
      initials: displayName[0]?.toUpperCase() || "U",
    };
  };

  // Format message preview
  const formatMessagePreview = (message: typeof conversations[0]['last_message']) => {
    if (!message) return '';
    const content = message.content;

    // 1) Prefer explicit message_type if it's present
    // @ts-ignore - message_type may not be in the TS type, but exists in the DB
    if (message.message_type === "gif") return "🎬 GIF";
    // @ts-ignore
    if (message.message_type === "poll") return "📊 Poll";

    // 2) Detect Giphy-style URLs in plain text
    if (content.includes("giphy.com") || content.includes("media.giphy.com")) {
      return "🎬 GIF";
    }

    // 3) If it looks like JSON, parse for attachment metadata
    const trimmed = content.trim();
    const looksLikeJson = trimmed.startsWith("{") && trimmed.endsWith("}");

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);

        // Voice / audio
        if (parsed.type?.startsWith("audio/")) return "🎤 Voice message";

        // Images
        if (parsed.type?.startsWith("image/")) return "📷 Photo";

        // Documents
        if (
          parsed.type === "application/pdf" ||
          parsed.type?.includes("document") ||
          parsed.type?.includes("word")
        ) {
          return "📄 Document";
        }

        // Generic file with a URL
        if (parsed.url) return "📎 File attachment";
      } catch {
        // If we can't parse, just fall through to text
      }
    }

    // 4) Regular text
    return content;
  };

  // Get active conversation details
  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  const handleConversationClick = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleBackToList = () => {
    setActiveConversationId(null);
    setMessageText("");
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversationId) return;
    
    try {
      await sendMessage(messageText, "text");
      setMessageText("");
      broadcastTyping();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[380px] p-0" align="end">
        {!activeConversationId ? (
          /* CONVERSATION LIST VIEW */
          <div className="flex flex-col h-[500px]">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-lg">Messages</h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start a conversation with your team!
                    </p>
                  </div>
                ) : (
                  recentConversations.map((conversation) => {
                    const { displayName, avatarUrl, initials } = getConversationDisplay(conversation);
                    const lastMessage = formatMessagePreview(conversation.last_message);
                    const hasUnread = conversation.unread_count > 0;

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleConversationClick(conversation.id)}
                        className={cn(
                          "w-full p-3 hover:bg-accent rounded-lg transition-colors text-left flex items-start gap-3",
                          hasUnread && "bg-accent/30"
                        )}
                      >
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={cn(
                              "font-medium text-sm truncate",
                              hasUnread ? "text-foreground" : "text-foreground/80"
                            )}>
                              {displayName}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {conversation.last_message_at && formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              hasUnread ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                              {conversation.last_message?.author_id === user?.id && (
                                <span className="font-medium">You: </span>
                              )}
                              {lastMessage}
                            </p>
                            {hasUnread && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="p-2 border-t">
              <button
                onClick={() => navigate("/messages")}
                className="w-full p-2 text-sm text-center hover:bg-accent rounded-lg transition-colors text-primary"
              >
                See all in Messages
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE CONVERSATION VIEW */
          <div className="flex flex-col h-[500px]">
            {/* Conversation Header */}
            <div className="p-3 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {activeConversation && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getConversationDisplay(activeConversation).avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getConversationDisplay(activeConversation).initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {getConversationDisplay(activeConversation).displayName}
                    </h3>
                  </div>
                </>
              )}
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hasMore && (
                    <div className="flex justify-center pb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadMore()}
                        disabled={isLoadingMore}
                        className="text-xs h-7"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Loading...
                          </>
                        ) : (
                          "Load more"
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.author_id === user?.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex items-end gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    broadcastTyping();
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[40px]"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  size="sm"
                  className="h-10 w-10 p-0 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { ConversationCard } from "./ConversationCard";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterType?: "all" | "channels" | "direct";
}

export function ConversationList({ selectedId, onSelect, filterType = "all" }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const { conversations } = useConversations();
  const { user } = useAuth();

  const filteredConversations = conversations.filter((conv) => {
    // Apply type filter
    if (filterType === "channels" && conv.type !== "group") return false;
    if (filterType === "direct" && conv.type !== "direct") return false;

    // Apply search filter
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    const title = conv.type === 'group' ? conv.title : 
      conv.participants.find((p) => p.id !== user?.id)?.full_name || '';
    
    return title?.toLowerCase().includes(searchLower);
  });

  const getConversationTitle = (conv: typeof conversations[0]) => {
    if (conv.type === 'group') return conv.title || 'Unnamed Group';
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id);
    
    // Smart fallback chain for missing names
    if (otherParticipant?.full_name) return otherParticipant.full_name;
    
    if (otherParticipant?.email) {
      // Try to extract name from email (e.g., josh.smith@example.com -> Josh Smith)
      const emailPart = otherParticipant.email.split('@')[0];
      const nameParts = emailPart.split(/[._-]/);
      if (nameParts.length >= 2) {
        return nameParts
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
      // Return just the email part if can't parse
      return emailPart;
    }
    
    return 'Team Member';
  };

  const getConversationAvatar = (conv: typeof conversations[0]) => {
    if (conv.type === 'group') {
      return { url: null, fallback: conv.title?.[0]?.toUpperCase() || 'G' };
    }
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id);
    return {
      url: otherParticipant?.avatar_url || null,
      fallback: otherParticipant?.full_name?.[0]?.toUpperCase() || 'U',
    };
  };

  const formatMessagePreview = (message: typeof conversations[0]['last_message']) => {
    if (!message) return '';
    
    const content = message.content;
    
    // Check message_type first (before JSON parsing)
    // @ts-ignore - message_type may not be in type definition but exists in database
    if (message.message_type === 'gif') {
      return '🎬 GIF';
    }
    
    // @ts-ignore - message_type may not be in type definition but exists in database
    if (message.message_type === 'poll') {
      return '📊 Poll';
    }
    
    // Try to parse as JSON (file attachments)
    try {
      const parsed = JSON.parse(content);
      
      // Voice/Audio messages
      if (parsed.type?.startsWith('audio/')) {
        return '🎤 Voice message';
      }
      
      // Image messages
      if (parsed.type?.startsWith('image/')) {
        return '📷 Photo';
      }
      
      // Document messages (PDF, DOCX, etc.)
      if (parsed.type === 'application/pdf' || 
          parsed.type?.includes('document') || 
          parsed.type?.includes('word')) {
        return '📄 Document';
      }
      
      // Generic file
      if (parsed.url) {
        return '📎 File attachment';
      }
    } catch {
      // Not JSON, continue to regular text
    }
    
    // Regular text message
    return content;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b bg-card/50">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-16 bg-background/50 focus:bg-background transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="px-1.5 pt-2 pb-6 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new conversation to get started</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const avatar = getConversationAvatar(conv);
              const title = getConversationTitle(conv);

              return (
                <ConversationCard
                  key={conv.id}
                  id={conv.id}
                  type={conv.type as "direct" | "group"}
                  title={title}
                  lastMessage={
                    conv.last_message
                      ? {
                          content: formatMessagePreview(conv.last_message),
                          created_at: conv.last_message.created_at,
                          isOwn: conv.last_message.author_id === user?.id,
                        }
                      : undefined
                  }
                  avatarUrl={avatar.url}
                  avatarFallback={avatar.fallback}
                  unreadCount={conv.unread_count}
                  isSelected={selectedId === conv.id}
                  isSystemChannel={conv.is_system_channel || false}
                  participantCount={conv.participants.length}
                  onClick={() => onSelect(conv.id)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

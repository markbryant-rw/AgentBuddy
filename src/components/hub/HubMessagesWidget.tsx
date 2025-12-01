import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface Conversation {
  id: string;
  title: string | null;
  last_message?: {
    content: string;
    created_at: string;
    author_id: string;
    message_type?: string;
  } | null;
  unread_count: number;
  participants: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  }>;
}

interface HubMessagesWidgetProps {
  conversations: Conversation[];
  unreadCount: number;
  onNewMessage?: () => void;
  isCollapsed?: boolean;
}

export const HubMessagesWidget = ({
  conversations,
  unreadCount,
  onNewMessage,
  isCollapsed
}: HubMessagesWidgetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const recentConversations = conversations.slice(0, 4);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getDisplayName = (conv: Conversation): string => {
    // For channels/groups with a title
    if (conv.title) return conv.title;
    
    // For direct messages, show the OTHER person
    const otherParticipants = conv.participants.filter(p => p.id !== user?.id);
    const otherParticipant = otherParticipants[0];
    
    if (!otherParticipant) return 'Team Member';
    
    // If we have their full name, use it
    if (otherParticipant.full_name) return otherParticipant.full_name;
    
    // Try to parse their email (e.g., josh.smith@example.com -> Josh Smith)
    if (otherParticipant.email) {
      const emailPart = otherParticipant.email.split('@')[0];
      const nameParts = emailPart.split(/[._-]/);
      if (nameParts.length >= 2) {
        return nameParts
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(' ');
      }
      return emailPart;
    }
    
    return 'Team Member';
  };

  const formatMessagePreview = (message: Conversation['last_message']) => {
    if (!message) return '';
    const content = message.content;

    // Priority 1: Check message_type first (most reliable)
    if (message.message_type === 'gif') return '🎬 GIF';
    if (message.message_type === 'poll') return '📊 Poll';

    // Priority 2: Detect Giphy URLs (common pattern)
    if (content.includes('giphy.com') || content.includes('media.giphy.com')) {
      return '🎬 GIF';
    }

    // Priority 3: Check if it looks like JSON (common for file attachments)
    const looksLikeJson = content.trim().startsWith('{') && content.trim().endsWith('}');
    
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(content);

        // Voice/Audio messages
        if (parsed.type?.startsWith('audio/')) return '🎤 Voice message';

        // Image messages
        if (parsed.type?.startsWith('image/')) return '📷 Photo';

        // Document messages (PDF, DOCX, etc.)
        if (parsed.type === 'application/pdf' || 
            parsed.type?.includes('document') || 
            parsed.type?.includes('word')) {
          return '📄 Document';
        }

        // Generic file with URL
        if (parsed.url) return '📎 File attachment';
      } catch {
        // If JSON parse fails, treat as text
      }
    }

    // Priority 4: Regular text message
    return content;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 border">
      <CardHeader className="border-b bg-card/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold">Messages</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate('/messages')} 
            className="gap-1.5 h-8 text-xs hover:bg-accent"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="py-2">
          {recentConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">No messages yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start a conversation!</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentConversations.map(conv => {
                const otherParticipants = conv.participants.filter(p => p.id !== user?.id);
                const otherParticipant = otherParticipants[0];
                const displayName = getDisplayName(conv);
                const hasUnread = conv.unread_count > 0;

                return (
                  <button 
                    key={conv.id} 
                    onClick={() => navigate('/messages', { state: { conversationId: conv.id } })} 
                    className={cn(
                      "w-full flex items-start gap-2.5 px-3 py-2 rounded-md transition-colors text-left",
                      hasUnread 
                        ? "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary" 
                        : "hover:bg-muted border-l-2 border-transparent"
                    )}
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarImage src={otherParticipant?.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(otherParticipant?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                        )}>
                          {displayName}
                        </p>
                        {hasUnread && (
                          <Badge variant="default" className="h-4 min-w-4 px-1 text-[10px] shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      {conv.last_message && (
                        <>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message.author_id === user?.id && (
                              <span className="font-medium">You: </span>
                            )}
                            {formatMessagePreview(conv.last_message)}
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            {formatDistanceToNow(new Date(conv.last_message.created_at), {
                              addSuffix: true
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

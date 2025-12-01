import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { MessagesHeader } from "./MessagesHeader";

interface ConversationHeaderProps {
  conversationId: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ConversationHeader({ conversationId, onBack, showBackButton }: ConversationHeaderProps) {
  const { conversations, archiveConversation } = useConversations();
  const { user } = useAuth();

  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) return null;

  const getTitle = () => {
    if (conversation.type === 'group') return conversation.title || 'Unnamed Group';
    const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.full_name || otherParticipant?.email || 'Unknown User';
  };

  const getAvatar = () => {
    if (conversation.type === 'group') {
      return { url: null, fallback: conversation.title?.[0]?.toUpperCase() || 'G' };
    }
    const otherParticipant = conversation.participants.find((p) => p.id !== user?.id);
    return {
      url: otherParticipant?.avatar_url || null,
      fallback: otherParticipant?.full_name?.[0]?.toUpperCase() || 'U',
    };
  };

  const avatar = getAvatar();
  const subtitle = conversation.type === 'group' 
    ? `${conversation.participants.length} members`
    : undefined;

  return (
    <MessagesHeader
      variant="conversation"
      title={getTitle()}
      subtitle={subtitle}
      avatarUrl={avatar.url || undefined}
      avatarFallback={avatar.fallback}
      showBackButton={showBackButton}
      onBack={onBack}
      actions={[
        <DropdownMenu key="menu">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => archiveConversation(conversationId)}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ]}
    />
  );
}

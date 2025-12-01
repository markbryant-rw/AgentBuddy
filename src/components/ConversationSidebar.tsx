import { Star, Trash2, Clock, Users, User } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { CollaborativeConversation } from "@/types/coaching";

interface ConversationSidebarProps {
  starredConversations: CollaborativeConversation[];
  myConversations: CollaborativeConversation[];
  sharedConversations: CollaborativeConversation[];
  friendsSharedConversations: CollaborativeConversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversation: CollaborativeConversation) => void;
  onStarConversation: (id: string, isStarred: boolean) => void;
  onDeleteConversation: (id: string) => void;
}

export const ConversationSidebar = ({
  starredConversations,
  myConversations,
  sharedConversations,
  friendsSharedConversations,
  currentConversationId,
  onSelectConversation,
  onStarConversation,
  onDeleteConversation,
}: ConversationSidebarProps) => {
  const getDaysUntilDeletion = (createdAt: string) => {
    const created = new Date(createdAt);
    const sevenDaysLater = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((sevenDaysLater.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const ConversationItem = ({
    conversation,
    showDeleteCountdown,
  }: {
    conversation: CollaborativeConversation;
    showDeleteCountdown?: boolean;
  }) => {
    const isActive = conversation.id === currentConversationId;
    const daysLeft = showDeleteCountdown ? getDaysUntilDeletion(conversation.created_at) : null;

    return (
      <div
        className={cn(
          "group relative flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors",
          isActive && "bg-muted border-primary"
        )}
        onClick={() => onSelectConversation(conversation)}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2 flex-1">{conversation.title}</h4>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onStarConversation(conversation.id, !conversation.is_starred);
              }}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  conversation.is_starred && "fill-yellow-500 text-yellow-500"
                )}
              />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}</span>
          {conversation.is_shared && (
            <Users className="h-3 w-3 text-primary" />
          )}
          {conversation.contributor_count && conversation.contributor_count > 1 && (
            <span className="text-xs">
              {conversation.contributor_count} contributors
            </span>
          )}
        </div>
        {daysLeft !== null && (
          <Badge variant="secondary" className="text-xs w-fit">
            Deletes in {daysLeft} {daysLeft === 1 ? "day" : "days"}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Conversations</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Unless starred, all chats will archive after 7 days
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {starredConversations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span>Starred</span>
              </div>
              <div className="space-y-2">
                {starredConversations.map((conversation) => (
                  <ConversationItem key={conversation.id} conversation={conversation} />
                ))}
              </div>
            </div>
          )}

          {sharedConversations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Users className="h-3 w-3" />
                <span>Team Shared</span>
              </div>
              <div className="space-y-2">
                {sharedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                  />
                ))}
              </div>
            </div>
          )}

          {friendsSharedConversations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <User className="h-3 w-3 text-primary" />
                <span>Shared with Friends</span>
              </div>
              <div className="space-y-2">
                {friendsSharedConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                  />
                ))}
              </div>
            </div>
          )}

          {myConversations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <User className="h-3 w-3" />
                <span>My Conversations (7 days)</span>
              </div>
              <div className="space-y-2">
                {myConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    showDeleteCountdown
                  />
                ))}
              </div>
            </div>
          )}

          {starredConversations.length === 0 && myConversations.length === 0 && sharedConversations.length === 0 && friendsSharedConversations.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No conversations yet. Start a new chat to get advice from the coaching board!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

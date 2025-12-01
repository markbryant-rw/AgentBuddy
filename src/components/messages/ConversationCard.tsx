import { memo } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { conversationThemes, getConversationTheme } from "@/lib/messageColors";

interface ConversationCardProps {
  id: string;
  type: "direct" | "group";
  title: string;
  lastMessage?: {
    content: string;
    created_at: string;
    isOwn: boolean;
  };
  avatarUrl?: string | null;
  avatarFallback: string;
  unreadCount: number;
  isSelected: boolean;
  isSystemChannel?: boolean;
  participantCount?: number;
  onClick: () => void;
}

const ConversationCardComponent = ({
  id,
  type,
  title,
  lastMessage,
  avatarUrl,
  avatarFallback,
  unreadCount,
  isSelected,
  isSystemChannel,
  participantCount,
  onClick,
}: ConversationCardProps) => {
  const theme = conversationThemes[getConversationTheme(type, isSystemChannel)];
  const hasUnread = unreadCount > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "w-full px-3 py-3 rounded-lg text-left transition-colors relative group",
        "border border-transparent touch-manipulation",
        isSelected && "bg-accent border-accent-foreground/20 shadow-sm",
        !isSelected && hasUnread && `${theme.accent} ${theme.border} shadow-sm ring-1 ring-inset ${theme.ring}`,
        !isSelected && !hasUnread && "hover:bg-accent/40 hover:border-border/50",
      )}
    >
      {/* Gradient accent line (shows on unread) */}
      {hasUnread && !isSelected && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b",
            theme.gradient
          )}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar with status ring */}
        <div className="relative shrink-0">
          <Avatar className={cn(
            "h-12 w-12 transition-all",
            hasUnread && "ring-2 ring-offset-2 ring-offset-background",
            hasUnread && theme.ring
          )}>
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className={cn(
              hasUnread && "font-semibold",
              hasUnread && theme.text
            )}>
              {avatarFallback}
            </AvatarFallback>
          </Avatar>

          {/* Type badge */}
          {type === "group" && (
            <div className={cn(
              "absolute -bottom-1 -right-1 rounded-full p-1.5",
              "bg-background border-2 border-card",
              theme.badge,
              "text-white"
            )}>
              <Users className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "line-clamp-2 leading-snug cursor-help",
                        hasUnread ? "font-semibold text-foreground" : "font-medium"
                      )}
                    >
                      {title}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">{title}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isSystemChannel && (
                <Badge 
                  variant="outline" 
                  className="shrink-0 text-xs px-1.5 py-0 h-5"
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Office
                </Badge>
              )}
            </div>

            {/* Timestamp */}
            {lastMessage && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(lastMessage.created_at), {
                  addSuffix: false,
                }).replace('about ', '')}
              </span>
            )}
          </div>

          {/* Last message preview */}
          {lastMessage && (
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  "text-sm truncate",
                  hasUnread
                    ? "text-foreground/80 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {lastMessage.isOwn && (
                  <span className="font-medium">You: </span>
                )}
                {lastMessage.content}
              </p>

              {/* Unread badge */}
              {hasUnread && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    "shrink-0 h-6 min-w-[24px] px-2 rounded-full",
                    "flex items-center justify-center",
                    "text-xs font-semibold text-white",
                    "bg-gradient-to-br",
                    theme.gradient,
                    "shadow-lg animate-pulse"
                  )}
                >
                  {unreadCount}
                </motion.div>
              )}
            </div>
          )}

          {/* Participant count for groups without last message */}
          {type === "group" && !lastMessage && participantCount && (
            <p className="text-sm text-muted-foreground">
              {participantCount} {participantCount === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// Memoize to prevent unnecessary re-renders when parent updates
export const ConversationCard = memo(ConversationCardComponent, (prev, next) => {
  // Custom comparison to avoid re-renders when unrelated props change
  return (
    prev.id === next.id &&
    prev.isSelected === next.isSelected &&
    prev.unreadCount === next.unreadCount &&
    prev.title === next.title &&
    prev.lastMessage?.content === next.lastMessage?.content &&
    prev.lastMessage?.created_at === next.lastMessage?.created_at &&
    prev.avatarUrl === next.avatarUrl
  );
});

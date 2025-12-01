import { memo } from "react";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import { Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
  is_typing?: boolean;
}

interface ConversationPresenceProps {
  users: PresenceUser[];
}

export const ConversationPresence = memo(({ users }: ConversationPresenceProps) => {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <TooltipProvider key={user.user_id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <OptimizedAvatar
                  src={user.avatar_url}
                  alt={user.full_name}
                  fallback={user.full_name.charAt(0).toUpperCase()}
                  className="h-6 w-6 border-2 border-background"
                  fallbackClassName="text-xs"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.full_name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {users.length > 3 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
            +{users.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  // Only re-render if user list actually changed
  if (prev.users.length !== next.users.length) return false;
  return prev.users.every((user, i) => 
    user.user_id === next.users[i]?.user_id && 
    user.avatar_url === next.users[i]?.avatar_url
  );
});

ConversationPresence.displayName = 'ConversationPresence';

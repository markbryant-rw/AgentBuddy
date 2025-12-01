import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
  is_typing?: boolean;
}

interface TypingIndicatorProps {
  users: PresenceUser[];
}

export const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const names = users.map((u) => u.full_name).join(", ");
  const text =
    users.length === 1
      ? `${names} is typing`
      : users.length === 2
      ? `${names} are typing`
      : `${names.split(",").slice(0, 2).join(",")} and ${users.length - 2} others are typing`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 px-4 py-3 bg-accent/30 backdrop-blur-sm border-t"
    >
      {/* Avatar with pulse ring */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          <AvatarImage src={users[0]?.avatar_url} />
          <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
            {getInitials(users[0]?.full_name)}
          </AvatarFallback>
        </Avatar>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-violet-400"
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Animated dots */}
      <div className="flex gap-1">
        <motion.span
          className="h-2 w-2 rounded-full bg-violet-500"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-violet-500"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-violet-500"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      
      <span className="text-sm text-muted-foreground font-medium">{text}</span>
    </motion.div>
  );
};

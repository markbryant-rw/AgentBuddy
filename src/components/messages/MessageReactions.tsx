import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Smile, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Reaction {
  emoji: string;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  onReact: (emoji: string) => void;
}

const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

export function MessageReactions({
  reactions,
  currentUserId,
  onReact,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (reactions.length === 0) {
    return (
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground"
          >
            <Smile className="h-3.5 w-3.5" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {commonEmojis.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onReact(emoji);
                  setShowPicker(false);
                }}
                className="h-8 w-8 rounded hover:bg-accent flex items-center justify-center text-lg"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 items-center mt-1">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => {
          const hasReacted = reaction.users.includes(currentUserId);
          const count = reaction.users.length;

          return (
            <motion.button
              key={reaction.emoji}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onReact(reaction.emoji)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
                "border backdrop-blur-sm",
                hasReacted
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-700 dark:text-violet-300"
                  : "bg-muted/50 border-border hover:bg-accent"
              )}
            >
              <span className="text-sm">{reaction.emoji}</span>
              {count > 1 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="font-medium"
                >
                  {count}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Add Reaction Button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground border border-border"
          >
            <Plus className="h-3 w-3" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {commonEmojis.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  onReact(emoji);
                  setShowPicker(false);
                }}
                className="h-8 w-8 rounded hover:bg-accent flex items-center justify-center text-lg"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

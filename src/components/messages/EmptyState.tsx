import { motion } from "framer-motion";
import { MessageSquare, Inbox, Search, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "no-conversations" | "no-messages" | "no-search-results" | "offline";
  onAction?: (suggestion?: string) => void;
  searchQuery?: string;
  userName?: string;
}

export function EmptyState({ type, onAction, searchQuery, userName }: EmptyStateProps) {
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as any }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: "spring" as any,
        stiffness: 200,
        damping: 15
      }
    }
  };

  if (type === "no-conversations") {
    return (
      <motion.div 
        variants={variants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <motion.div
          variants={iconVariants}
          className="relative mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full blur-2xl" />
          <div className="relative p-6 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
            <MessageSquare className="h-16 w-16 text-violet-600 dark:text-violet-400" />
          </div>
        </motion.div>

        <motion.h3 
          className="text-2xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Start your first conversation!
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground mb-6 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Connect with your teammates and start collaborating in real-time
        </motion.p>

        {onAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              onClick={() => onAction()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30"
            >
              Find teammates
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (type === "no-messages") {
    return (
      <motion.div 
        variants={variants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            transition: { duration: 2, repeat: Infinity, repeatDelay: 2 }
          }}
          className="mb-6"
        >
          <div className="text-7xl">👋</div>
        </motion.div>

        <motion.h3 
          className="text-xl font-semibold mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Say hello to {userName || "start chatting"}!
        </motion.h3>
        
        <motion.p 
          className="text-sm text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Be the first to send a message
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2 flex-wrap justify-center"
        >
          {["Hey! 👋", "How's it going?", "Let's chat!"].map((suggestion, i) => (
            <motion.button
              key={suggestion}
              onClick={() => onAction?.(suggestion)}
              className="px-4 py-2 rounded-full bg-accent hover:bg-accent/80 text-sm font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  if (type === "no-search-results") {
    return (
      <motion.div 
        variants={variants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <motion.div
          animate={{ 
            rotate: [0, -10, 10, -10, 0],
            transition: { duration: 0.5 }
          }}
          className="mb-6"
        >
          <Search className="h-16 w-16 text-muted-foreground/50" />
        </motion.div>

        <h3 className="text-xl font-semibold mb-2">No messages found</h3>
        
        <p className="text-sm text-muted-foreground mb-2">
          We couldn't find any messages matching
        </p>
        
        <p className="text-sm font-medium text-foreground mb-6">
          "{searchQuery}"
        </p>

        <p className="text-xs text-muted-foreground">
          Try different keywords or check your spelling
        </p>
      </motion.div>
    );
  }

  if (type === "offline") {
    return (
      <motion.div 
        variants={variants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <motion.div
          animate={{ 
            opacity: [0.5, 1, 0.5],
            transition: { duration: 2, repeat: Infinity }
          }}
          className="mb-6"
        >
          <Wifi className="h-16 w-16 text-muted-foreground/50" />
        </motion.div>

        <h3 className="text-xl font-semibold mb-2">You're offline</h3>
        
        <p className="text-sm text-muted-foreground max-w-md">
          Messages will send when you're back online
        </p>
      </motion.div>
    );
  }

  return null;
}

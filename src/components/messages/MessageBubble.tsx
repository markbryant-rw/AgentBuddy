import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import { AudioPlayer } from "./AudioPlayer";
import { MessageReactions } from "./MessageReactions";
import { PollMessage } from "./PollMessage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, FileType, ExternalLink, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Reaction {
  emoji: string;
  users: string[];
}

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    edited: boolean;
    message_type?: string;
    reactions?: Reaction[];
    author?: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  isOwn: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showImageModal, setShowImageModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation variants
  const bubbleVariants = {
    initial: { 
      opacity: 0, 
      x: isOwn ? 20 : -20,
      y: 10 
    },
    animate: { 
      opacity: 1, 
      x: 0,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as any
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const handleReact = async (emoji: string) => {
    if (!user) return;

    try {
      const currentReactions = message.reactions || [];
      let updatedReactions = [...currentReactions];
      
      const emojiIndex = updatedReactions.findIndex(r => r.emoji === emoji);
      
      if (emojiIndex >= 0) {
        const hasReacted = updatedReactions[emojiIndex].users.includes(user.id);
        
        if (hasReacted) {
          updatedReactions[emojiIndex].users = updatedReactions[emojiIndex].users.filter(
            id => id !== user.id
          );
          if (updatedReactions[emojiIndex].users.length === 0) {
            updatedReactions = updatedReactions.filter((_, idx) => idx !== emojiIndex);
          }
        } else {
          updatedReactions[emojiIndex].users.push(user.id);
        }
      } else {
        updatedReactions.push({ emoji, users: [user.id] });
      }

      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions as any })
        .eq('id', message.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  // Handle Poll Messages
  if (message.message_type === "poll") {
    const pollId = message.content;
    const isTemporary = pollId.startsWith("Creating") || pollId.startsWith("📊");
    
    return (
      <motion.div
        variants={bubbleVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}
      >
        {!isOwn && (
          <OptimizedAvatar
            src={message.author?.avatar_url}
            alt={message.author?.full_name || "User"}
            fallback={message.author?.full_name?.[0]?.toUpperCase() || 'U'}
            className="h-8 w-8 flex-shrink-0"
          />
        )}
        <div className={cn("flex flex-col gap-1", isOwn && "items-end")}>
          {!isOwn && message.author && (
            <span className="text-xs font-medium text-muted-foreground mb-1">
              {message.author.full_name}
            </span>
          )}
          {isTemporary ? (
            <div className="rounded-2xl border bg-card p-4 space-y-3 max-w-md shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">{pollId}</p>
              </div>
            </div>
          ) : (
            <PollMessage pollId={pollId} messageId={message.id} />
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{format(new Date(message.created_at), 'h:mm a')}</span>
            {message.edited && <span>· Edited</span>}
          </div>
        </div>
      </motion.div>
    );
  }

  // Handle GIF Messages
  if (message.message_type === "gif") {
    let gifData: any = null;
    try {
      gifData = JSON.parse(message.content);
    } catch (e) {
      console.error("Failed to parse GIF data:", e);
    }

    if (gifData) {
      return (
        <motion.div
          variants={bubbleVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}
        >
          {!isOwn && (
            <OptimizedAvatar
              src={message.author?.avatar_url}
              alt={message.author?.full_name || "User"}
              fallback={message.author?.full_name?.[0]?.toUpperCase() || 'U'}
              className="h-8 w-8 flex-shrink-0"
            />
          )}
          <div className={cn("flex flex-col gap-1", isOwn && "items-end")}>
            {!isOwn && message.author && (
              <span className="text-xs font-medium text-muted-foreground">
                {message.author.full_name}
              </span>
            )}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl overflow-hidden max-w-md shadow-md border-4 border-white dark:border-gray-800"
            >
              <img 
                src={gifData.url} 
                alt={gifData.title || "GIF"} 
                className="w-full"
                loading="lazy"
              />
            </motion.div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{format(new Date(message.created_at), 'h:mm a')}</span>
              {message.edited && <span>· Edited</span>}
            </div>
          </div>
        </motion.div>
      );
    }
  }

  // Parse file content
  let fileData: any = null;
  if (message.message_type === "file") {
    try {
      fileData = JSON.parse(message.content);
    } catch (e) {
      console.error("Failed to parse file data:", e);
    }
  }

  const isImage = fileData?.fileType?.startsWith("image/");
  const isAudio = fileData?.fileType?.startsWith("audio/");
  const isDocument = fileData?.fileType?.includes('pdf') || 
                     fileData?.fileType?.includes('document');

  return (
    <motion.div
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {!isOwn && (
        <OptimizedAvatar
          src={message.author?.avatar_url}
          alt={message.author?.full_name || "User"}
          fallback={message.author?.full_name?.[0]?.toUpperCase() || 'U'}
          className="h-8 w-8 flex-shrink-0"
        />
      )}

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
        {!isOwn && message.author && (
          <span className="text-xs font-medium text-muted-foreground">
            {message.author.full_name}
          </span>
        )}

        {/* Image Messages */}
        {isImage && fileData ? (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <img
              src={fileData.url}
              alt={fileData.filename}
              className="rounded-2xl max-w-sm max-h-96 object-cover cursor-pointer border-4 border-white dark:border-gray-800 shadow-lg"
              loading="lazy"
              decoding="async"
              onClick={() => setShowImageModal(true)}
            />
            <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
              <DialogContent className="max-w-4xl">
                <img
                  src={fileData.url}
                  alt={fileData.filename}
                  className="w-full h-auto"
                  loading="lazy"
                  decoding="async"
                />
              </DialogContent>
            </Dialog>
          </motion.div>
        ) : isAudio && fileData ? (
          /* Audio Messages */
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={cn(
              "rounded-2xl p-3 border backdrop-blur-sm",
              isOwn
                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white border-violet-400/20 shadow-lg"
                : "bg-card/80 border-border shadow-md"
            )}
          >
            <AudioPlayer url={fileData.url} duration={fileData.duration} />
          </motion.div>
        ) : isDocument && fileData ? (
          /* Document Messages */
          <motion.a
            whileHover={{ scale: 1.02, y: -2 }}
            href={fileData.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-sm transition-all max-w-sm",
              isOwn 
                ? "bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-400/20 shadow-lg hover:shadow-xl"
                : "bg-card/80 border-border shadow-md hover:shadow-lg hover:bg-accent"
            )}
          >
            <div className="flex-shrink-0 p-2 rounded-lg bg-white/10">
              {fileData.fileType === 'application/pdf' ? (
                <FileText className="h-8 w-8" />
              ) : (
                <FileType className="h-8 w-8" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileData.filename}</p>
              <p className={cn(
                "text-xs",
                isOwn ? "text-white/70" : "text-muted-foreground"
              )}>
                {(fileData.size / 1024).toFixed(0)} KB · Click to view
              </p>
            </div>
            <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-70" />
          </motion.a>
        ) : (
          /* Text Messages */
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={cn(
              "rounded-2xl px-4 py-3 backdrop-blur-sm transition-all relative overflow-hidden",
              isOwn
                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg border border-violet-400/20"
                : "bg-card/80 border border-border shadow-md"
            )}
          >
            {/* Gradient overlay for own messages */}
            {isOwn && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
            
            <p className="text-sm whitespace-pre-wrap break-words relative z-10">
              {message.content}
            </p>
          </motion.div>
        )}

        {/* Timestamp and Status */}
        <div className={cn(
          "flex items-center gap-2 text-xs transition-opacity",
          isOwn ? "text-muted-foreground" : "text-muted-foreground",
          isHovered ? "opacity-100" : "opacity-70"
        )}>
          <span>{format(new Date(message.created_at), 'h:mm a')}</span>
          {message.edited && <span>· Edited</span>}
          {isOwn && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCheck className="h-3 w-3 text-violet-500" />
            </motion.div>
          )}
        </div>

        {/* Reactions */}
        {user && (
          <AnimatePresence>
            <MessageReactions
              messageId={message.id}
              reactions={message.reactions || []}
              currentUserId={user.id}
              onReact={handleReact}
            />
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return prev.message.id === next.message.id &&
         prev.message.content === next.message.content &&
         prev.message.edited === next.message.edited &&
         prev.isOwn === next.isOwn &&
         JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions);
});

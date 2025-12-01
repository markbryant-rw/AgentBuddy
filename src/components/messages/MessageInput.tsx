import { useState, KeyboardEvent, useRef, DragEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Mic, Upload, BarChart3, Smile, Image as ImageIcon, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFileUpload } from "@/hooks/useFileUpload";
import { VoiceRecorder } from "./VoiceRecorder";
import { AttachmentPreview } from "./AttachmentPreview";
import { PollCreator } from "./PollCreator";
import { GifPicker } from "./GifPicker";
import { useCreatePoll } from "@/hooks/usePoll";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

interface MessageInputProps {
  onSend: (content: string, messageType?: string) => Promise<any>;
  conversationId: string;
  onTyping?: () => void;
}

interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

export function MessageInput({ onSend, conversationId, onTyping }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { uploadMultiple, uploadAudio } = useFileUpload();
  const { mutateAsync: createPoll } = useCreatePoll();

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || isSending) return;

    setIsSending(true);
    try {
      if (attachments.length > 0) {
        // Upload all attachments
        const uploadedFiles = await uploadMultiple(
          attachments.map(a => a.file),
          conversationId
        );
        
        // Send each file as a separate message
        for (const fileData of uploadedFiles) {
          await onSend(JSON.stringify(fileData), "file");
        }
        
        setAttachments([]);
      }
      
      if (content.trim()) {
        await onSend(content.trim());
      }
      
      setContent("");
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Validate: images (PNG, JPG, GIF, WebP), PDFs, DOCX
      const validTypes = [
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Unsupported file type`);
        return false;
      }
      
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 20MB)`);
        return false;
      }
      
      return true;
    });
    
    // Generate previews and add to attachments
    validFiles.forEach(file => {
      const id = `${Date.now()}-${Math.random()}`;
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            setAttachments(prev => [...prev, {
              id,
              file,
              preview: result,
              type: 'image'
            }]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, {
          id,
          file,
          type: 'document'
        }]);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      const files = imageItems
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);
      
      if (files.length > 0) {
        processFiles(files);
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    setIsSending(true);
    try {
      const audioData = await uploadAudio(audioBlob, conversationId);
      await onSend(JSON.stringify({ ...audioData, duration }), "file");
    } catch (error) {
      console.error("Failed to send voice note:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping?.();
  };

  const handleCreatePoll = async (question: string, options: string[], allowMultiple: boolean, expiresAt?: Date) => {
    setIsSending(true);
    try {
      logger.log("🗳️ Step 1: Creating poll message");
      
      // Step 1: Create the message first with poll ID placeholder
      const messageData = await onSend(`📊 Poll: ${question}`, "poll");
      
      logger.log("🗳️ Step 2: Message created:", messageData);
      
      if (!messageData?.id) {
        throw new Error("Failed to create message - no message ID returned");
      }

      logger.log("🗳️ Step 3: Creating poll record for message:", messageData.id);
      
      // Step 2: Create the poll record
      const pollData = await createPoll({
        messageId: messageData.id,
        question,
        options,
        allowMultiple,
        expiresAt,
      });

      logger.log("🗳️ Step 4: Poll created:", pollData);

      if (!pollData?.id) {
        throw new Error("Failed to create poll - no poll ID returned");
      }

      logger.log("🗳️ Step 5: Updating message with poll ID:", pollData.id);

      // Step 3: Update the message content with poll ID
      const { error: updateError } = await supabase
        .from("messages")
        .update({ content: pollData.id })
        .eq("id", messageData.id);

      if (updateError) {
        console.error("🗳️ Failed to update message:", updateError);
        throw updateError;
      }

      logger.log("🗳️ Step 6: Poll creation complete!");
      
      setShowPollCreator(false);
      toast.success("Poll created");
    } catch (error) {
      console.error("❌ Failed to create poll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create poll");
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectGif = async (gifUrl: string, gifTitle: string) => {
    setIsSending(true);
    try {
      const gifData = { url: gifUrl, title: gifTitle };
      await onSend(JSON.stringify(gifData), "gif");
    } catch (error) {
      console.error("Failed to send GIF:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [content]);

  return (
    <div 
      className={cn(
        "border-t backdrop-blur-md bg-card/95 transition-all relative",
        isDragging && "bg-violet-50/50 dark:bg-violet-950/20 border-violet-400 border-2 border-dashed"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-2 border-violet-400 border-dashed rounded-2xl p-8 shadow-xl backdrop-blur-sm">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Upload className="h-16 w-16 text-violet-500 mx-auto mb-3" />
              </motion.div>
              <p className="text-violet-600 dark:text-violet-400 font-semibold text-lg">Drop files here</p>
              <p className="text-violet-500/70 text-sm mt-1">Images, PDFs, or documents</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-3 pb-2"
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map(attachment => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={handleRemoveAttachment}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {/* Toolbar */}
        <div className="flex gap-1 flex-shrink-0">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="h-9 w-9 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={isSending || attachments.length > 0}
              className="h-9 w-9 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Voice message"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPollCreator(true)}
              disabled={isSending}
              className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Create poll"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGifPicker(true)}
              disabled={isSending}
              className="h-9 w-9 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              title="Add GIF"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="min-h-[44px] max-h-[200px] resize-none pr-12 rounded-2xl border-2 focus:border-violet-400 dark:focus:border-violet-600 transition-all"
            disabled={isSending}
            rows={1}
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {content.length > 0 && `${content.length}`}
          </div>
        </div>
        
        {/* Send Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSend}
            disabled={(!content.trim() && attachments.length === 0) || isSending}
            size="icon"
            className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <motion.div
              animate={isSending ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.5, repeat: isSending ? Infinity : 0 }}
            >
              <Send className="h-5 w-5" />
            </motion.div>
          </Button>
        </motion.div>
      </div>

      <VoiceRecorder
        open={showVoiceRecorder}
        onOpenChange={setShowVoiceRecorder}
        onSend={handleVoiceSend}
      />

      <PollCreator
        open={showPollCreator}
        onOpenChange={setShowPollCreator}
        onCreatePoll={handleCreatePoll}
      />

      <GifPicker
        open={showGifPicker}
        onOpenChange={setShowGifPicker}
        onSelectGif={handleSelectGif}
      />
    </div>
  );
}

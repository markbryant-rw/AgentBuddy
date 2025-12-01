import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { RichTextPostEditor } from "./RichTextPostEditor";
import DOMPurify from 'dompurify';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string, mentionedUserIds?: string[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CommentSection({ comments, onAddComment, isExpanded, onToggle }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<Set<string>>(new Set());

  const handleMentionAdd = (userId: string) => {
    setMentionedUsers((prev) => new Set(prev).add(userId));
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newComment, Array.from(mentionedUsers));
      setNewComment("");
      setMentionedUsers(new Set());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pl-2 border-l-2 border-border">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles.avatar_url} />
            <AvatarFallback>
              {comment.profiles.full_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="bg-accent rounded-lg p-2">
              <p className="text-sm font-medium">{comment.profiles.full_name}</p>
              <div 
                className="text-sm text-foreground mt-0.5 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-2">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}

      <div className="pt-2">
        <RichTextPostEditor
          value={newComment}
          onChange={setNewComment}
          placeholder="Write a comment... (Type @ to mention someone)"
          onMentionAdd={handleMentionAdd}
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </div>
  );
}

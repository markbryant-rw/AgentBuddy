import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { TransactionNote } from "@/hooks/useTransactionNotes";
import ReactMarkdown from 'react-markdown';

interface TransactionNoteItemProps {
  note: TransactionNote;
  currentUserId: string;
  onReact: (noteId: string, emoji: string) => void;
  onDelete: (noteId: string) => void;
}

export function TransactionNoteItem({ note, currentUserId, onReact, onDelete }: TransactionNoteItemProps) {
  const commonEmojis = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];
  const isAuthor = note.author_id === currentUserId;

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={note.author?.avatar_url} />
        <AvatarFallback className="text-xs">
          {note.author?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm">{note.author?.full_name || 'Unknown'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </span>
          {isAuthor && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="text-sm text-foreground prose prose-sm max-w-none">
          <ReactMarkdown 
            components={{
              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
              em: ({node, ...props}) => <em className="italic" {...props} />,
            }}
          >
            {note.body}
          </ReactMarkdown>
        </div>

        <div className="flex items-center gap-1 flex-wrap pt-1">
          {note.reactions.map((reaction) => {
            const hasReacted = reaction.users.includes(currentUserId);
            return (
              <button
                key={reaction.emoji}
                onClick={() => onReact(note.id, reaction.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                  hasReacted
                    ? "bg-primary/20 border border-primary"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs">{reaction.users.length}</span>
              </button>
            );
          })}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-1">
                {commonEmojis.map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact(note.id, emoji)}
                    className="text-lg p-1 h-8 w-8"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactionNotes } from "@/hooks/useTransactionNotes";
import { TransactionNoteItem } from "./TransactionNoteItem";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TransactionNotesTabProps {
  transactionId: string;
}

export function TransactionNotesTab({ transactionId }: TransactionNotesTabProps) {
  const { user } = useAuth();
  const { notes, isLoading, createNote, addReaction, deleteNote } = useTransactionNotes(transactionId);
  const [newNote, setNewNote] = useState("");

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    createNote.mutate(newNote.trim());
    setNewNote("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-1 px-6 py-4">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No notes yet. Be the first to add one!
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <TransactionNoteItem
                key={note.id}
                note={note}
                currentUserId={user.id}
                onReact={(noteId, emoji) => addReaction.mutate({ noteId, emoji })}
                onDelete={(noteId) => deleteNote.mutate(noteId)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4 space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a note... Use *bold* or _italic_ for formatting"
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd> to send
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!newNote.trim() || createNote.isPending}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

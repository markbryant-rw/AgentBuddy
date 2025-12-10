import { useState } from 'react';
import { useAppraisalNotes, AppraisalNote } from '@/hooks/useAppraisalNotes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, Send, MessageSquare, Activity, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AppraisalNotesTabProps {
  appraisalId: string;
}

const SELLING_PLANS_MAP: Record<string, string> = {
  'next_3_months': 'Thinking of selling in the next 3 months',
  'next_6_months': 'Thinking of selling in the next 6 months',
  'next_12_months': 'Thinking of selling in the next 12 months',
  'not_sure': 'Not sure about timing',
  'just_curious': 'Just curious about property value',
};

const WANTS_MORE_INFO_MAP: Record<string, string> = {
  'recent_sales': 'Recent sales in my area',
  'market_trends': 'Market trends and timing advice',
  'property_improvements': 'Property improvements to maximize value',
  'selling_process': 'Information about the selling process',
};

export const AppraisalNotesTab = ({ appraisalId }: AppraisalNotesTabProps) => {
  const { notes, isLoading, addNote, deleteNote, isAddingNote } = useAppraisalNotes(appraisalId);
  const { user } = useAuth();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await addNote({ content: newNote.trim() });
      setNewNote('');
      toast({ title: 'Note added' });
    } catch (error) {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast({ title: 'Note deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete note', variant: 'destructive' });
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderBeaconSurveyNote = (note: AppraisalNote) => {
    const metadata = note.metadata || {};
    const isHighIntent = metadata.sellingPlans === 'next_3_months' || metadata.sellingPlans === 'next_6_months';

    return (
      <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border-teal-200 dark:border-teal-800">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-600" />
            <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              Beacon Survey
            </Badge>
            {isHighIntent && (
              <Badge className="bg-orange-500 text-white">
                🔥 High Intent
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          {metadata.usefulnessRating && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">⭐ Rating:</span>
              <span className="font-medium">{metadata.usefulnessRating}/5 stars</span>
            </div>
          )}
          
          {metadata.sellingPlans && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📅 Selling Plans:</span>
              <span className="font-medium">{SELLING_PLANS_MAP[metadata.sellingPlans] || metadata.sellingPlans}</span>
            </div>
          )}
          
          {metadata.wantsMoreInfo && metadata.wantsMoreInfo.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">📚 Wants More Info:</span>
              <span className="font-medium">
                {metadata.wantsMoreInfo.map((item: string) => WANTS_MORE_INFO_MAP[item] || item).join(', ')}
              </span>
            </div>
          )}
          
          {metadata.questionsComments && (
            <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-md">
              <span className="text-muted-foreground">💬 Comments:</span>
              <p className="mt-1 font-medium italic">"{metadata.questionsComments}"</p>
            </div>
          )}
        </div>

        <Collapsible className="mt-3">
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
            View raw data →
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderManualNote = (note: AppraisalNote) => {
    const canDelete = note.author_id === user?.id;

    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={note.author?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(note.author?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {note.author?.full_name || 'Unknown'}
                </span>
                {note.source === 'system' && (
                  <Badge variant="outline" className="text-xs">System</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
              <ReactMarkdown>{note.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Add Note
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note about this appraisal..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Supports markdown: *bold*, _italic_, - lists, etc.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isAddingNote}
            className="gap-2"
          >
            {isAddingNote ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes Timeline */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          Notes ({notes.length})
        </div>
        
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <p className="text-xs">Add a note or Beacon survey responses will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id}>
                {note.source === 'beacon_survey' ? renderBeaconSurveyNote(note) : renderManualNote(note)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

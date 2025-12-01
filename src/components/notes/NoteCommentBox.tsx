import { useState } from 'react';
import { useNoteComments } from '@/hooks/useNoteComments';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Check, Trash2 } from 'lucide-react';

interface NoteCommentBoxProps {
  noteId: string;
}

export function NoteCommentBox({ noteId }: NoteCommentBoxProps) {
  const { user } = useAuth();
  const { comments, createComment, deleteComment, resolveComment } = useNoteComments(noteId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user profiles for all comments
  const userIds = [...new Set(comments.map(c => c.user_id))];
  const { data: profiles = {} } = useQuery({
    queryKey: ['comment-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      
      if (error) throw error;
      
      return data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: userIds.length > 0,
  });

  const handleSubmit = async () => {
    if (!newComment.trim() || !noteId || !user) return;

    const commentBody = { 
      type: 'doc', 
      content: [{ type: 'paragraph', content: [{ type: 'text', text: newComment }] }] 
    };
    
    // Validate structure
    if (!commentBody.type || !Array.isArray(commentBody.content)) {
      console.error('Invalid comment structure');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment.mutateAsync({
        note_id: noteId,
        body: commentBody,
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCommentBody = (body: any) => {
    if (!body?.content) return '';
    
    return body.content
      .map((node: any) => {
        if (node.type === 'paragraph' && node.content) {
          return node.content.map((c: any) => c.text || '').join('');
        }
        return '';
      })
      .join('\n');
  };

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          No comments yet
        </Card>
      ) : (
        comments.map((comment) => {
          const profile = profiles[comment.user_id];
          return (
          <Card key={comment.id} className={`p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name || profile?.email || 'Unknown User'}
                  </p>
                  <div className="flex items-center gap-2">
                    {comment.user_id === user?.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveComment.mutate({ id: comment.id, resolved: !comment.resolved })}
                        >
                          <Check className={`h-3 w-3 ${comment.resolved ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteComment.mutate(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                  {renderCommentBody(comment.body)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  {comment.resolved && ' · Resolved'}
                </p>
              </div>
            </div>
          </Card>
        );
        })
      )}

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
          className="min-h-[80px]"
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Cmd/Ctrl + Enter to submit
          </p>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}

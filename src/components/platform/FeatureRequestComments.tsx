import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFeatureRequestComments } from '@/hooks/useFeatureRequestComments';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';

interface FeatureRequestCommentsProps {
  featureRequestId: string;
}

export const FeatureRequestComments = ({ featureRequestId }: FeatureRequestCommentsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const { comments, isLoading, addComment, deleteComment, isAdding } = useFeatureRequestComments(featureRequestId);
  const { isPlatformAdmin } = useAuth();

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <MessageSquare className="h-4 w-4 mr-2" />
          {comments?.length || 0} comments
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 mt-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading comments...</div>
        ) : (
          <>
            {comments && comments.length > 0 && (
              <div className="space-y-2">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {comment.profiles?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {comment.profiles?.full_name || 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                        {isPlatformAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {isPlatformAdmin && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment as platform admin..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || isAdding}
                  size="sm"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

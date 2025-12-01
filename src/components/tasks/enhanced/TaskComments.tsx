import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      // @ts-ignore - New table not yet in generated types
      const { data, error } = await (supabase as any)
        .from('task_comments')
        .select('id, task_id, user_id, content, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user details separately
      const comments = data || [];
      const userIds = [...new Set(
        comments
          .map((c: any) => c.user_id)
          .filter((id): id is string => typeof id === 'string' && id !== null)
      )];
      
      if (userIds.length === 0) return comments;
      
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds as string[]);
      
      return comments.map((comment: any) => ({
        ...comment,
        user: users?.find((u: any) => u.id === comment.user_id),
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      // @ts-ignore - New table not yet in generated types
      const { error } = await (supabase as any)
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setNewComment('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* Comment List */}
      <div className="space-y-4">
        {comments.map((comment: any) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.user?.avatar_url} />
              <AvatarFallback>
                {comment.user?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.user?.full_name || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!newComment.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}

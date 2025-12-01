import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBugReportComments } from '@/hooks/useBugReportComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send, Edit, Trash2, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BugReportCommentsSectionProps {
  bugReportId: string;
}

export const BugReportCommentsSection = ({ bugReportId }: BugReportCommentsSectionProps) => {
  const { user } = useAuth();
  const { comments, isLoading, addComment, editComment, deleteComment } = useBugReportComments(bugReportId);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch user roles for all comment authors to identify platform admins
  const { data: userRoles } = useQuery({
    queryKey: ['comment-user-roles', bugReportId],
    queryFn: async () => {
      if (!comments || comments.length === 0) return {};
      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'platform_admin')
        .is('revoked_at', null);
      
      const adminMap: Record<string, boolean> = {};
      data?.forEach(role => {
        adminMap[role.user_id] = true;
      });
      return adminMap;
    },
    enabled: !!comments && comments.length > 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addComment(newComment);
    setNewComment('');
  };

  const handleEdit = (id: string, content: string) => {
    setEditingCommentId(id);
    setEditingContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId) return;
    await editComment({ commentId: editingCommentId, content: editingContent });
    setEditingCommentId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteComment(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Comments</h4>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet</p>
          ) : (
            comments?.map((comment) => {
              const isAdminComment = userRoles?.[comment.user_id] || false;
              
              return (
                <div key={comment.id} className="flex gap-3">
                  {isAdminComment ? (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {comment.author?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {isAdminComment ? 'Platform Admin' : (comment.author?.full_name || 'Unknown')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.user_id === user?.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(comment.id, comment.content)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{comment.content}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

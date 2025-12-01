import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTaskComments } from '@/hooks/useTaskComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPastedImage } from '@/lib/imageUpload';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
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

interface TaskCommentsSectionProps {
  taskId: string;
}

export const TaskCommentsSection = ({ taskId }: TaskCommentsSectionProps) => {
  const { user } = useAuth();
  const { comments, isLoading, addComment, editComment, deleteComment } = useTaskComments(taskId);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addComment(newComment);
    setNewComment('');
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const blob = items[i].getAsFile();
        if (!blob) continue;
        
        try {
          toast.info('Uploading image...');
          const { publicUrl, fileName, fileSize, fileType } = await uploadPastedImage(blob, taskId);
          
          const textarea = e.target as HTMLTextAreaElement;
          const cursorPos = textarea.selectionStart;
          const textBefore = newComment.substring(0, cursorPos);
          const textAfter = newComment.substring(cursorPos);
          
          const newCommentText = `${textBefore}\n![${fileName}](${publicUrl})\n${textAfter}`;
          setNewComment(newCommentText);
          
          await supabase.from('task_attachments').insert({
            task_id: taskId,
            file_name: fileName,
            file_path: publicUrl,
            file_type: fileType,
            file_size: fileSize,
            uploaded_by: user?.id
          });
          
          toast.success('Image pasted');
        } catch (error) {
          toast.error('Failed to upload image');
        }
      }
    }
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onPaste={handlePaste}
          placeholder="Add comment (paste images)..."
          className="min-h-[80px]"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : comments?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet</p>
          ) : (
            comments?.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.avatar_url || undefined} />
                  <AvatarFallback>{comment.author?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.author?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {comment.user_id === user?.id && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(comment.id, comment.content)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeletingId(comment.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div>{comment.content.includes('![') ? (
                      <ReactMarkdown components={{ img: (props) => <img {...props} className="max-w-full rounded" /> }}>
                        {comment.content}
                      </ReactMarkdown>
                    ) : <p className="text-sm">{comment.content}</p>}</div>
                  )}
                </div>
              </div>
            ))
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

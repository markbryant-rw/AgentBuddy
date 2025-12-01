import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, X, FileIcon, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaskAttachmentsProps {
  taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery<any[]>({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      // @ts-ignore - New table not yet in generated types
      const { data, error } = await (supabase as any)
        .from('task_attachments')
        .select('id, task_id, file_name, file_url, file_type, file_size, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      
      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // Save to database
      // @ts-ignore - New table not yet in generated types
      const { error: dbError } = await (supabase as any)
        .from('task_attachments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;
      
      setUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast({ title: 'File uploaded successfully' });
    },
    onError: () => {
      setUploading(false);
      toast({ 
        title: 'Upload failed', 
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      // @ts-ignore - New table not yet in generated types
      const { error } = await (supabase as any)
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast({ title: 'Attachment removed' });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile.mutate(file);
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          <h3 className="font-semibold">Attachments</h3>
          <span className="text-sm text-muted-foreground">({attachments.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {attachments.map((attachment: any) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border group hover:bg-accent"
            >
              {isImage(attachment.file_type) ? (
                <ImageIcon className="h-5 w-5 text-blue-500" />
              ) : (
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              )}
              
              <div className="flex-1 min-w-0">
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {attachment.file_name}
                </a>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAttachment.mutate(attachment.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No attachments yet. Upload files to share with your team.
        </p>
      )}
    </div>
  );
}

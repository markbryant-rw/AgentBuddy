import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useProviderAttachments } from '@/hooks/directory/useProviderAttachments';
import { Upload, Download, Trash2, FileText, Image as ImageIcon, File } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ProviderAttachmentsSectionProps {
  providerId: string;
}

export const ProviderAttachmentsSection = ({ providerId }: ProviderAttachmentsSectionProps) => {
  const { attachments, uploadAttachment, deleteAttachment, getDownloadUrl } = useProviderAttachments(providerId);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const file = files[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    await uploadAttachment.mutateAsync(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownload = async (attachment: any) => {
    try {
      const url = await getDownloadUrl(attachment.file_path);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Maximum file size: 10MB
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
            input.click();
          }}
          disabled={uploadAttachment.isPending}
        >
          Select File
        </Button>
      </div>

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No attachments yet. Upload files to get started.
          </p>
        ) : (
          attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);
            
            return (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => deleteAttachment.mutateAsync(attachment)}
                    disabled={deleteAttachment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

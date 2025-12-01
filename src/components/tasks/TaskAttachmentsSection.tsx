import { useTaskAttachments } from "@/hooks/useTaskAttachments";
import { Button } from "@/components/ui/button";
import { Upload, File, Image, X, Download } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { toast } from "sonner";

interface TaskAttachmentsSectionProps {
  taskId: string;
}

export const TaskAttachmentsSection = ({ taskId }: TaskAttachmentsSectionProps) => {
  const { attachments, isLoading, uploadAttachment, deleteAttachment } = useTaskAttachments(taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxAttachment, setLightboxAttachment] = useState<any>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        await uploadAttachment(file);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const loadPreviews = async () => {
      const imageAttachments = attachments.filter(a => a.file_type.startsWith('image/'));
      const urls: Record<string, string> = {};
      
      for (const attachment of imageAttachments) {
        const { data } = await supabase.storage
          .from('message-attachments')
          .createSignedUrl(attachment.file_path, 3600);
        
        if (data?.signedUrl) {
          urls[attachment.id] = data.signedUrl;
        }
      }
      
      setPreviewUrls(urls);
    };
    
    if (attachments.length > 0) loadPreviews();
  }, [attachments]);

  const handleDownload = async (attachment: any) => {
    const { data } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.file_path, 60);
    
    if (data?.signedUrl) {
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Attachments</label>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const isImage = attachment.file_type.startsWith('image/');
            const previewUrl = previewUrls[attachment.id];
            
            return (
              <div 
                key={attachment.id} 
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                onClick={() => {
                  if (isImage) {
                    setLightboxAttachment(attachment);
                  } else {
                    handleDownload(attachment);
                  }
                }}
              >
                {/* Thumbnail for images */}
                {isImage && previewUrl ? (
                  <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={previewUrl} 
                      alt={attachment.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    {getFileIcon(attachment.file_type)}
                  </div>
                )}
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.file_size ? `${Math.round(attachment.file_size / 1024)} KB` : 'Unknown size'}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isImage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(attachment);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAttachment(attachment.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxAttachment && (
        <AttachmentLightbox
          attachment={lightboxAttachment}
          allImageAttachments={attachments.filter(a => a.file_type.startsWith('image/'))}
          onClose={() => setLightboxAttachment(null)}
        />
      )}
    </div>
  );
};

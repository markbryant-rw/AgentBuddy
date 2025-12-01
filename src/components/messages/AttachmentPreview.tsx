import { Button } from "@/components/ui/button";
import { X, FileText, FileType } from "lucide-react";

interface AttachmentPreviewProps {
  attachment: {
    id: string;
    file: File;
    preview?: string;
    type: 'image' | 'document';
  };
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  return (
    <div className="relative inline-block bg-muted rounded-lg p-2 mr-2 mb-2">
      {attachment.type === 'image' && attachment.preview ? (
        <img 
          src={attachment.preview} 
          alt={attachment.file.name}
          className="h-20 w-20 object-cover rounded"
        />
      ) : (
        <div className="h-20 w-20 flex flex-col items-center justify-center gap-1">
          {attachment.file.type === 'application/pdf' ? (
            <FileText className="h-8 w-8 text-red-500" />
          ) : (
            <FileType className="h-8 w-8 text-blue-500" />
          )}
          <span className="text-xs text-muted-foreground truncate max-w-full px-1">
            {attachment.file.name.length > 12 
              ? attachment.file.name.substring(0, 12) + '...' 
              : attachment.file.name}
          </span>
        </div>
      )}
      
      <Button
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 h-5 w-5"
        onClick={() => onRemove(attachment.id)}
      >
        <X className="h-3 w-3" />
      </Button>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-b">
        {(attachment.file.size / 1024).toFixed(0)}KB
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TaskAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

interface AttachmentLightboxProps {
  attachment: TaskAttachment;
  allImageAttachments: TaskAttachment[];
  onClose: () => void;
}

export const AttachmentLightbox = ({ 
  attachment, 
  allImageAttachments, 
  onClose 
}: AttachmentLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(
    allImageAttachments.findIndex(a => a.id === attachment.id)
  );
  const [imageUrl, setImageUrl] = useState<string>('');

  const currentAttachment = allImageAttachments[currentIndex];

  useEffect(() => {
    const loadImage = async () => {
      const { data } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(currentAttachment.file_path, 3600);
      
      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
    };

    if (currentAttachment) {
      loadImage();
    }
  }, [currentAttachment]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < allImageAttachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={currentAttachment.file_name}
              className="max-w-full max-h-full object-contain"
            />
          )}
          
          {/* Navigation buttons */}
          {allImageAttachments.length > 1 && (
            <>
              {currentIndex > 0 && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              
              {currentIndex < allImageAttachments.length - 1 && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </>
          )}
          
          {/* Close button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-gray-900 shadow-lg border border-gray-200"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Counter and filename */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 px-4 py-2 rounded-lg">
            <p className="text-sm font-medium">{currentAttachment.file_name}</p>
            {allImageAttachments.length > 1 && (
              <p className="text-xs text-muted-foreground text-center mt-1">
                {currentIndex + 1} / {allImageAttachments.length}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
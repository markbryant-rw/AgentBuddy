import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImage, RESIZE_PRESETS } from "@/lib/imageResize";
import {
  validateImageFile,
  validateDocumentFile,
  validateAudioFile,
  sanitizeFilename,
} from "@/lib/fileValidation";

interface UploadFileParams {
  file: File | Blob;
  conversationId: string;
  filename: string;
}

export async function uploadFile({ file, conversationId, filename }: UploadFileParams) {
  const timestamp = Date.now();
  const sanitizedFilename = sanitizeFilename(filename);
  const path = `${conversationId}/${timestamp}-${sanitizedFilename}`;

  const { data, error } = await supabase.storage
    .from("message-attachments")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("message-attachments")
    .getPublicUrl(path);

  return publicUrl;
}

export function useFileUpload() {
  const uploadImage = async (file: File, conversationId: string) => {
    try {
      // Comprehensive validation with magic byte checking
      const validation = await validateImageFile(file);

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid image file");
      }

      // Resize image using message preset
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.message);
      const resizedFile = new File([resizedBlob], validation.sanitizedFilename!, { type: resizedBlob.type });

      const url = await uploadFile({
        file: resizedFile,
        conversationId,
        filename: validation.sanitizedFilename!,
      });

      // Get image dimensions from resized file
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = URL.createObjectURL(resizedFile);
      });

      return {
        url,
        filename: validation.sanitizedFilename!,
        fileType: resizedFile.type,
        size: resizedFile.size,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
      throw error;
    }
  };

  const uploadAudio = async (blob: Blob, conversationId: string) => {
    try {
      // Create File object for validation
      const audioFile = new File([blob], `voice-note-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      });

      // Validate audio file
      const validation = await validateAudioFile(audioFile);

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid audio file");
      }

      const url = await uploadFile({
        file: blob,
        conversationId,
        filename: validation.sanitizedFilename!,
      });

      return {
        url,
        filename: validation.sanitizedFilename!,
        fileType: blob.type,
        size: blob.size,
      };
    } catch (error: any) {
      toast.error(error.message || "Failed to upload audio");
      throw error;
    }
  };

  const uploadDocument = async (file: File, conversationId: string) => {
    try {
      // Comprehensive validation with magic byte checking
      const validation = await validateDocumentFile(file);

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid document file");
      }

      const url = await uploadFile({
        file,
        conversationId,
        filename: validation.sanitizedFilename!,
      });

      return {
        url,
        filename: validation.sanitizedFilename!,
        fileType: file.type,
        size: file.size,
      };
    } catch (error: any) {
      toast.error(error.message || "Failed to upload document");
      throw error;
    }
  };

  const uploadMultiple = async (files: File[], conversationId: string) => {
    const uploads = files.map(file => {
      if (file.type.startsWith('image/')) {
        return uploadImage(file, conversationId);
      } else {
        return uploadDocument(file, conversationId);
      }
    });
    
    return Promise.all(uploads);
  };

  return {
    uploadImage,
    uploadAudio,
    uploadDocument,
    uploadMultiple,
  };
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImage, RESIZE_PRESETS } from "@/lib/imageResize";

interface UploadFileParams {
  file: File | Blob;
  conversationId: string;
  filename: string;
}

export async function uploadFile({ file, conversationId, filename }: UploadFileParams) {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
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
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image");
      }

      // Validate file size (10MB max before resizing)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Image must be less than 10MB");
      }

      // Resize image using message preset
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.message);
      const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type });

      const url = await uploadFile({
        file: resizedFile,
        conversationId,
        filename: file.name,
      });

      // Get image dimensions from resized file
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = URL.createObjectURL(resizedFile);
      });

      return {
        url,
        filename: file.name,
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
      // Validate file size (20MB max)
      if (blob.size > 20 * 1024 * 1024) {
        throw new Error("Audio must be less than 20MB");
      }

      const filename = `voice-note-${Date.now()}.webm`;
      const url = await uploadFile({
        file: blob,
        conversationId,
        filename,
      });

      return {
        url,
        filename,
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
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!validTypes.includes(file.type)) {
        throw new Error("Unsupported document type");
      }
      
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("Document must be less than 20MB");
      }
      
      const url = await uploadFile({
        file,
        conversationId,
        filename: file.name,
      });
      
      return {
        url,
        filename: file.name,
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

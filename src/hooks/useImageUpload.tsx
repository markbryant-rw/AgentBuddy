import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateImageFile, sanitizeFilename } from "@/lib/fileValidation";

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Comprehensive validation with magic byte checking
      const validation = await validateImageFile(file);

      if (!validation.valid) {
        toast.error(validation.error || "Invalid image file");
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique filename with sanitized name
      const fileExt = validation.sanitizedFilename!.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadImage(file));
    const results = await Promise.all(uploadPromises);
    return results.filter((url): url is string => url !== null);
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = imageUrl.split('/post-images/');
      if (urlParts.length !== 2) return false;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('post-images')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Failed to delete image:", error);
      return false;
    }
  };

  return {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    uploading,
  };
}

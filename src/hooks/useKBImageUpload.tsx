import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

export function useKBImageUpload() {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { team } = useTeam();

  const uploadImage = async (file: File, context: 'playbook' | 'card' = 'playbook'): Promise<string | null> => {
    try {
      setUploading(true);

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload a valid image file (JPG, PNG, WEBP, or GIF)");
        return null;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return null;
      }

      if (!user || !team) {
        toast.error("Authentication required");
        return null;
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}/${context}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('knowledge-base-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('knowledge-base-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = imageUrl.split('/knowledge-base-images/');
      if (urlParts.length !== 2) return false;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('knowledge-base-images')
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
    deleteImage,
    uploading,
  };
}

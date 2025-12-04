import { supabase } from '@/integrations/supabase/client';
import { resizeImage, RESIZE_PRESETS } from './imageResize';
import { validateImageFile } from './fileValidation';

export const uploadPastedImage = async (file: File, taskId: string) => {
  try {
    // Comprehensive validation with magic byte checking
    const validation = await validateImageFile(file);

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file');
    }

    // Resize image with timeout to prevent hanging
    const resizedBlob = await Promise.race([
      resizeImage(file, RESIZE_PRESETS.message),
      new Promise<Blob>((_, reject) =>
        setTimeout(() => reject(new Error('Image resize timeout after 10 seconds')), 10000)
      )
    ]) as Blob;

    const resizedFile = new File([resizedBlob], validation.sanitizedFilename!, { type: resizedBlob.type });

    const fileExt = resizedFile.type.split('/')[1] || 'jpg';
    const fileName = `${taskId}-${Date.now()}.${fileExt}`;
    const filePath = `note-images/${fileName}`;

    // Upload to Supabase Storage with timeout
    const uploadPromise = supabase.storage
      .from('message-attachments')
      .upload(filePath, resizedFile);

    const { data, error } = await Promise.race([
      uploadPromise,
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
      )
    ]);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(filePath);

    return {
      publicUrl,
      fileName: validation.sanitizedFilename!,
      fileSize: resizedFile.size,
      fileType: resizedFile.type
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
  }
};

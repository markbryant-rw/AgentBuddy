import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export interface ProviderAttachment {
  id: string;
  provider_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export const useProviderAttachments = (providerId: string) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['provider-attachments', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_attachments')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProviderAttachment[];
    },
    enabled: !!providerId,
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !team) throw new Error('User or team not found');

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${team.id}/${providerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('provider-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error: dbError } = await supabase
        .from('provider_attachments')
        .insert({
          provider_id: providerId,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-attachments', providerId] });
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to upload file: ' + error.message);
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: ProviderAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('provider-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('provider_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-attachments', providerId] });
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete file: ' + error.message);
    },
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('provider-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  };

  return {
    attachments,
    isLoading,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
  };
};

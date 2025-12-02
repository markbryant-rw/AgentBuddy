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

  const { data: attachments = [], isLoading } = useQuery<ProviderAttachment[]>({
    queryKey: ['provider-attachments', providerId],
    queryFn: async () => {
      if (!team || !providerId) return [];

      const folderPath = `${team.id}/${providerId}`;
      const { data, error } = await (supabase as any).storage
        .from('provider-attachments')
        .list(folderPath, { limit: 100 });

      if (error) throw error;

      return (data || []).map((file: any) => ({
        id: file.name,
        provider_id: providerId,
        user_id: user?.id || '',
        file_name: file.name,
        file_path: `${folderPath}/${file.name}`,
        file_size: file.metadata?.size ?? 0,
        file_type: file.metadata?.mimetype ?? 'application/octet-stream',
        created_at: file.created_at || new Date().toISOString(),
      }));
    },
    enabled: !!team && !!providerId,
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !team) throw new Error('User or team not found');

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${team.id}/${providerId}/${fileName}`;

      const { error: uploadError } = await (supabase as any).storage
        .from('provider-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
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
      const { error: storageError } = await (supabase as any).storage
        .from('provider-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;
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
    const { data, error } = await (supabase as any).storage
      .from('provider-attachments')
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return data.signedUrl as string;
  };

  return {
    attachments,
    isLoading,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
  };
};

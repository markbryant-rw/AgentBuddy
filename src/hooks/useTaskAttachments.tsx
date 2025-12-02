import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export const useTaskAttachments = (taskId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TaskAttachment[];
    },
    enabled: !!taskId,
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `task-attachments/${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from("task_attachments")
        .insert({
          task_id: taskId,
          uploaded_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      // Activity logging skipped - table not implemented
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-activity", taskId] });
      toast.success("Attachment uploaded");
    },
    onError: () => {
      toast.error("Failed to upload attachment");
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      // Get attachment to delete file from storage
      const { data: attachment } = await supabase
        .from("task_attachments")
        .select("file_path")
        .eq("id", attachmentId)
        .single();

      if (attachment) {
        await supabase.storage
          .from("message-attachments")
          .remove([attachment.file_path]);
      }

      // Delete attachment record
      const { error } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      toast.success("Attachment deleted");
    },
    onError: () => {
      toast.error("Failed to delete attachment");
    },
  });

  return {
    attachments,
    isLoading,
    uploadAttachment: uploadAttachment.mutateAsync,
    deleteAttachment: deleteAttachment.mutate,
  };
};

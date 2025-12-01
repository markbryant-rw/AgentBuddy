import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { toast } from "sonner";

export function usePlaybookEditor(playbookId?: string) {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  // Fetch playbook data for editing
  const { data: playbook, isLoading } = useQuery({
    queryKey: ['playbook-editor', playbookId],
    queryFn: async () => {
      if (!playbookId) return null;

      const { data, error } = await supabase
        .from('knowledge_base_playbooks')
        .select('*')
        .eq('id', playbookId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!playbookId,
  });

  // Create playbook
  const createPlaybook = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category_id: string;
      cover_image?: string;
      estimated_minutes?: number;
      roles?: string[];
      tags?: string[];
      is_published: boolean;
    }) => {
      if (!user || !team) throw new Error('Not authenticated');

      const { data: newPlaybook, error } = await supabase
        .from('knowledge_base_playbooks')
        .insert({
          ...data,
          team_id: team.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newPlaybook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Playbook created successfully');
    },
    onError: (error) => {
      console.error('Error creating playbook:', error);
      toast.error('Failed to create playbook');
    },
  });

  // Update playbook
  const updatePlaybook = useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      description?: string;
      category_id?: string;
      cover_image?: string;
      estimated_minutes?: number;
      roles?: string[];
      tags?: string[];
      is_published?: boolean;
    }) => {
      const { id, ...updates } = data;
      
      const { data: updated, error } = await supabase
        .from('knowledge_base_playbooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-editor'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Playbook updated successfully');
    },
    onError: (error) => {
      console.error('Error updating playbook:', error);
      toast.error('Failed to update playbook');
    },
  });

  // Delete playbook
  const deletePlaybook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base_playbooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Playbook deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting playbook:', error);
      toast.error('Failed to delete playbook');
    },
  });

  return {
    playbook,
    isLoading,
    createPlaybook: createPlaybook.mutate,
    updatePlaybook: updatePlaybook.mutate,
    deletePlaybook: deletePlaybook.mutate,
    isCreating: createPlaybook.isPending,
    isUpdating: updatePlaybook.isPending,
    isDeleting: deletePlaybook.isPending,
  };
}

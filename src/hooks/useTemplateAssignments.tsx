import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TemplateAssignment {
  id: string;
  template_id: string;
  assigned_to_type: 'agency' | 'team';
  assigned_to_id: string;
  assigned_by: string;
  created_at: string;
}

export const useTemplateAssignments = (templateId?: string) => {
  const queryClient = useQueryClient();

  // Fetch assignments for a specific template
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['template-assignments', templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('template_assignments')
        .select('*')
        .eq('template_id', templateId);

      if (error) throw error;
      return data as TemplateAssignment[];
    },
    enabled: !!templateId,
  });

  // Create assignment
  const { mutateAsync: createAssignment } = useMutation({
    mutationFn: async ({
      templateId,
      assignedToType,
      assignedToId,
    }: {
      templateId: string;
      assignedToType: 'agency' | 'team';
      assignedToId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('template_assignments')
        .insert({
          template_id: templateId,
          assigned_to_type: assignedToType,
          assigned_to_id: assignedToId,
          assigned_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Template assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign template: ' + error.message);
    },
  });

  // Delete assignment
  const { mutateAsync: deleteAssignment } = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('template_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      toast.success('Assignment removed');
    },
    onError: (error) => {
      toast.error('Failed to remove assignment: ' + error.message);
    },
  });

  return {
    assignments,
    isLoading,
    createAssignment,
    deleteAssignment,
  };
};

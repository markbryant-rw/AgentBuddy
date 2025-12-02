import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TemplateAssignment {
  id: string;
  template_id: string;
  assigned_to_type: 'agency' | 'team';
  assigned_to_id: string;
  assigned_by: string;
  created_at: string;
}

// Stubbed hook - template_assignments table not yet implemented
export const useTemplateAssignments = (templateId?: string) => {
  const queryClient = useQueryClient();

  // Fetch assignments for a specific template
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['template-assignments', templateId],
    queryFn: async (): Promise<TemplateAssignment[]> => {
      // Table not implemented - return empty array
      return [];
    },
    enabled: !!templateId,
  });

  // Create assignment
  const { mutateAsync: createAssignment } = useMutation({
    mutationFn: async (data: {
      templateId: string;
      assignedToType: 'agency' | 'team';
      assignedToId: string;
    }) => {
      toast.info('Template assignments coming soon');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-assignments'] });
    },
  });

  // Delete assignment
  const { mutateAsync: deleteAssignment } = useMutation({
    mutationFn: async (assignmentId: string) => {
      toast.info('Template assignments coming soon');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-assignments'] });
    },
  });

  return {
    assignments,
    isLoading,
    createAssignment,
    deleteAssignment,
  };
};
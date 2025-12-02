import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Stub implementation - project_templates table not yet implemented
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  lifecycle_stage: string;
  tasks: Array<{
    title: string;
    priority: string;
    due_offset_days: number;
    description?: string;
  }>;
  team_id: string | null;
  agency_id?: string | null;
  is_system_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  default_assignee_role?: string | null;
  template_version?: number;
  is_archived?: boolean;
  usage_count?: number;
}

export const useProjectTemplates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['project-templates', user?.id],
    queryFn: async (): Promise<ProjectTemplate[]> => {
      // Project templates feature not yet implemented
      return [];
    },
    enabled: !!user,
  });

  const getTemplateByStage = (stage: string) => {
    return templates.find(t => t.lifecycle_stage === stage && t.is_system_default);
  };

  const createTemplate = useMutation({
    mutationFn: async (newTemplate: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      toast.info('Project templates feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectTemplate> }) => {
      toast.info('Project templates feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      toast.info('Project templates feature coming soon');
    },
    onError: (error) => {
      toast.error('Failed to delete template');
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      toast.info('Project templates feature coming soon');
      return null;
    },
    onError: (error) => {
      toast.error('Failed to duplicate template');
    },
  });

  return {
    templates,
    isLoading,
    getTemplateByStage,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    duplicateTemplate: duplicateTemplate.mutateAsync,
  };
};

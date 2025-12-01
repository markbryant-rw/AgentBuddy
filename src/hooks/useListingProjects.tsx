import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProjectTemplates } from './useProjectTemplates';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

interface Listing {
  id: string;
  address: string;
  status: string;
  team_id: string;
  expected_month: string;
}

export const useListingProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getTemplateByStage } = useProjectTemplates();

  const createProjectFromListing = useMutation({
    mutationFn: async ({ listing, newStatus }: { listing: Listing; newStatus: string }) => {
      const template = getTemplateByStage(newStatus);
      
      if (!template) {
        console.log('No template found for stage:', newStatus);
        return null;
      }

      // Create the project
      const projectTitle = `${listing.address} – ${template.name}`;
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectTitle,
          description: template.description,
          team_id: listing.team_id,
          status: 'active',
          priority: 'high',
          listing_id: listing.id,
          due_date: listing.expected_month || null,
          created_by: user!.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create tasks from template
      const baseDueDate = listing.expected_month ? new Date(listing.expected_month) : new Date();
      const tasksToCreate = template.tasks.map((taskTemplate: any) => ({
        title: taskTemplate.title,
        description: null,
        team_id: listing.team_id,
        project_id: project.id,
        status: 'todo' as const,
        priority: taskTemplate.priority,
        due_date: format(addDays(baseDueDate, taskTemplate.due_offset_days), 'yyyy-MM-dd'),
        created_by: user!.id,
        last_updated_by: user!.id,
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (tasksError) throw tasksError;

      // Log template usage
      await supabase.from('template_usage_log').insert({
        template_id: template.id,
        project_id: project.id,
        listing_id: listing.id,
        created_by: user!.id,
      });

      // Increment template usage count
      await supabase
        .from('project_templates')
        .update({ usage_count: (template.usage_count || 0) + 1 })
        .eq('id', template.id);

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-analytics'] });
      toast.success('Project created from listing');
    },
    onError: (error) => {
      console.error('Failed to create project from listing:', error);
      toast.error('Failed to create project');
    },
  });

  return {
    createProjectFromListing: createProjectFromListing.mutateAsync,
  };
};

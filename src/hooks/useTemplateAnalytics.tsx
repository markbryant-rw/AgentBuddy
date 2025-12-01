import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  usageCount: number;
  averageCompletionRate: number;
  averageDuration: number;
  lifecycleStage: string;
}

export const useTemplateAnalytics = () => {
  const { user } = useAuth();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['template-analytics', user?.id],
    queryFn: async () => {
      // Get all templates with their usage data
      const { data: templates, error: templatesError } = await supabase
        .from('project_templates')
        .select(`
          id,
          name,
          lifecycle_stage,
          usage_count
        `)
        .eq('is_archived', false);

      if (templatesError) throw templatesError;

      // Get usage logs with project completion data
      const { data: usageLogs, error: logsError } = await supabase
        .from('template_usage_log')
        .select(`
          template_id,
          project_id,
          created_at,
          projects (
            id,
            status,
            created_at,
            updated_at
          )
        `);

      if (logsError) throw logsError;

      // Calculate analytics for each template
      const analyticsData: TemplateAnalytics[] = templates.map(template => {
        const templateLogs = usageLogs.filter(log => log.template_id === template.id);
        const projectData = templateLogs.map(log => log.projects).filter(Boolean);

        const completedProjects = projectData.filter((p: any) => p.status === 'completed');
        const averageCompletionRate = projectData.length > 0 
          ? (completedProjects.length / projectData.length) * 100 
          : 0;

        const durations = completedProjects.map((p: any) => {
          const start = new Date(p.created_at).getTime();
          const end = new Date(p.updated_at).getTime();
          return (end - start) / (1000 * 60 * 60 * 24); // days
        });

        const averageDuration = durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

        return {
          templateId: template.id,
          templateName: template.name,
          usageCount: template.usage_count || 0,
          averageCompletionRate,
          averageDuration,
          lifecycleStage: template.lifecycle_stage,
        };
      });

      return analyticsData;
    },
    enabled: !!user,
  });

  return {
    analytics,
    isLoading,
  };
};

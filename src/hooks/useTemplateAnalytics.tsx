import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface TemplateAnalytics {
  templateId: string;
  templateName: string;
  usageCount: number;
  averageCompletionRate: number;
  averageDuration: number;
  lifecycleStage: string;
}

// Stubbed hook - project_templates and template_usage_log tables not yet implemented
export const useTemplateAnalytics = () => {
  const { user } = useAuth();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['template-analytics', user?.id],
    queryFn: async (): Promise<TemplateAnalytics[]> => {
      // Tables not implemented - return empty array
      return [];
    },
    enabled: !!user,
  });

  return {
    analytics,
    isLoading,
  };
};
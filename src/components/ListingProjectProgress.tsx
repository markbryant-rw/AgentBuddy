import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectProgressBar } from '@/components/tasks/ProjectProgressBar';
import { Button } from '@/components/ui/button';
import { ExternalLink, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingProjectProgressProps {
  listingId: string;
}

export const ListingProjectProgress = ({ listingId }: ListingProjectProgressProps) => {
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['listing-projects', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks(id, status)
        `)
        .eq('listing_id', listingId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(project => ({
        ...project,
        task_count: project.tasks.length,
        completed_task_count: project.tasks.filter((t: any) => t.status === 'done').length,
      }));
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Folder className="h-4 w-4 text-primary" />
          Active Projects
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tasks')}
          className="text-xs"
        >
          View All
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        {projects.map((project) => {
          const progress = project.task_count > 0
            ? Math.round((project.completed_task_count / project.task_count) * 100)
            : 0;

          return (
            <Card key={project.id} className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{project.title}</span>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                <ProjectProgressBar progress={progress} />
                <div className="text-xs text-muted-foreground">
                  {project.completed_task_count} / {project.task_count} tasks completed
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

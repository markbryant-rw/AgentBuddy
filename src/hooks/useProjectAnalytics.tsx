import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProjectAnalytics = (filters?: {
  stage?: string;
  userId?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["project-analytics", user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      const { data: teamData } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!teamData) throw new Error("No team found");

      // Fetch projects with listing data and tasks
      let query = supabase
        .from("projects")
        .select(`
          *,
          listing:listings_pipeline(id, stage, address),
          tasks(id, completed, due_date, status),
          assignees:project_assignees(user_id)
        `)
        .eq("team_id", teamData.team_id);

      if (filters?.userId) {
        query = query.contains("assignees", [{ user_id: filters.userId }]);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      // Group by lifecycle stage
      const projectsByStage = {
        call: [] as any[],
        vap: [] as any[],
        map: [] as any[],
        lap: [] as any[],
        won: [] as any[],
        lost: [] as any[],
        manual: [] as any[], // Projects not linked to listings
      };

      projects?.forEach(project => {
        const stage = project.listing?.stage || 'manual';
        if (projectsByStage[stage as keyof typeof projectsByStage]) {
          projectsByStage[stage as keyof typeof projectsByStage].push(project);
        }
      });

      // Calculate project progress
      const projectProgress = projects?.map(project => {
        const tasks = project.tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.completed).length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const overdueTasks = tasks.filter(
          (t: any) => !t.completed && t.due_date && new Date(t.due_date) < new Date()
        ).length;

        return {
          id: project.id,
          title: project.title,
          stage: project.listing?.stage || 'manual',
          address: project.listing?.address,
          progress: Math.round(progress),
          totalTasks,
          completedTasks,
          overdueTasks,
          status: project.status,
        };
      }) || [];

      // Calculate average duration by stage
      const completedProjects = projects?.filter(p => p.status === 'completed') || [];
      const avgDurationByStage = Object.keys(projectsByStage).reduce((acc, stage) => {
        const stageProjects = completedProjects.filter(
          p => (p.listing?.stage || 'manual') === stage
        );
        if (stageProjects.length === 0) {
          acc[stage] = 0;
          return acc;
        }
        
        const totalDays = stageProjects.reduce((sum, p) => {
          const start = new Date(p.created_at);
          const end = new Date(p.updated_at);
          const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        
        acc[stage] = Math.round(totalDays / stageProjects.length);
        return acc;
      }, {} as Record<string, number>);

      // Status distribution
      const statusDistribution = {
        active: projects?.filter(p => p.status === 'active').length || 0,
        completed: projects?.filter(p => p.status === 'completed').length || 0,
        on_hold: projects?.filter(p => p.status === 'on_hold').length || 0,
      };

      return {
        byStage: projectsByStage,
        progress: projectProgress,
        avgDurationByStage,
        statusDistribution,
        totalProjects: projects?.length || 0,
      };
    },
    enabled: !!user,
  });
};

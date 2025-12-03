import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, MessageSquare, TrendingUp, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

export function GrowQuickStats() {
  const { user } = useAuth();
  const { team } = useTeam();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["grow-quick-stats", user?.id, team?.id],
    queryFn: async () => {
      if (!user?.id || !team?.id) {
        return {
          learningPathsActive: 0,
          knowledgeBaseItems: 0,
          coachingSessions: 0,
          skillProgress: 0,
        };
      }

      const { data: conversations } = await (supabase as any)
        .from('coaching_conversations')
        .select('id')
        .eq('user_id', user.id);

      const { data: playbooks } = await (supabase as any)
        .from('knowledge_base_playbooks')
        .select('id')
        .eq('team_id', team.id)
        .eq('is_published', true);

      const { data: completedCards } = await (supabase as any)
        .from('kb_card_views')
        .select('card_id')
        .eq('user_id', user.id)
        .eq('completed', true);

      const { data: totalCards } = await (supabase as any)
        .from('knowledge_base_cards')
        .select('id')
        .in(
          'playbook_id',
          (playbooks || []).map((p: any) => p.id)
        );

      const completed = completedCards?.length || 0;
      const total = totalCards?.length || 0;
      const skillProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        learningPathsActive: 0, // Placeholder for future feature
        knowledgeBaseItems: playbooks?.length || 0,
        coachingSessions: conversations?.length || 0,
        skillProgress,
      };
    },
    enabled: !!user?.id && !!team?.id,
  });

  const quickStats = [
    {
      title: "Active Learning Paths",
      value: stats?.learningPathsActive || 0,
      icon: Target,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Knowledge Base Items",
      value: stats?.knowledgeBaseItems || 0,
      icon: BookOpen,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Coaching Sessions",
      value: stats?.coachingSessions || 0,
      icon: MessageSquare,
      color: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-100 dark:bg-pink-900/30",
    },
    {
      title: "Skill Progress",
      value: `${stats?.skillProgress || 0}%`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

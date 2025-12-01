import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, Mic2, ArrowRight, MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

export function GrowNavigationCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { team } = useTeam();

  // Fetch coaching conversations count
  const { data: coachingStats } = useQuery({
    queryKey: ["coaching-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalConversations: 0, starredConversations: 0 };

      const { data, error } = await supabase
        .from("coaching_conversations")
        .select("id, is_starred", { count: "exact" })
        .eq("user_id", user.id);

      if (error) throw error;

      return {
        totalConversations: data?.length || 0,
        starredConversations: data?.filter(c => c.is_starred).length || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch knowledge base stats
  const { data: knowledgeStats } = useQuery({
    queryKey: ["knowledge-stats", team?.id, user?.id],
    queryFn: async () => {
      if (!team?.id || !user?.id) return { totalCategories: 0, totalPlaybooks: 0, completedCards: 0 };

      // Get total categories
      const { data: categories, error: catError } = await supabase
        .from("knowledge_base_categories")
        .select("id", { count: "exact" })
        .eq("team_id", team.id);

      if (catError) throw catError;

      // Get total published playbooks
      const { data: playbooks, error: pbError } = await supabase
        .from("knowledge_base_playbooks")
        .select("id", { count: "exact" })
        .eq("team_id", team.id)
        .eq("is_published", true);

      if (pbError) throw pbError;

      // Get user's completed cards
      const { data: completedCards, error: ccError } = await supabase
        .from("kb_card_views")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("completed", true);

      if (ccError) throw ccError;

      return {
        totalCategories: categories?.length || 0,
        totalPlaybooks: playbooks?.length || 0,
        completedCards: completedCards?.length || 0,
      };
    },
    enabled: !!team?.id && !!user?.id,
  });

  // Fetch roleplaying stats
  const { data: roleplayStats } = useQuery({
    queryKey: ["roleplay-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalScenarios: 0, completedSessions: 0, avgRating: 0 };

      const [scenarios, sessions] = await Promise.all([
        supabase.from("roleplay_scenarios").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("roleplay_sessions").select("rating").eq("user_id", user.id).eq("completed", true),
      ]);

      const avgRating = sessions.data && sessions.data.length > 0
        ? sessions.data.reduce((acc, s) => acc + (s.rating || 0), 0) / sessions.data.length
        : 0;

      return {
        totalScenarios: scenarios.count || 0,
        completedSessions: sessions.data?.length || 0,
        avgRating,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch feedback stats
  const { data: feedbackStats } = useQuery({
    queryKey: ["feedback-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { bugReports: 0, featureRequests: 0, points: 0 };
      
      const [bugCount, featureCount, profile] = await Promise.all([
        supabase.from("bug_reports").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("feature_requests").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("total_bug_points").eq("id", user.id).single(),
      ]);
      
      return {
        bugReports: bugCount.count || 0,
        featureRequests: featureCount.count || 0,
        points: profile.data?.total_bug_points || 0,
      };
    },
    enabled: !!user?.id,
  });

  const cards = [
    {
      title: "AI Coaching Board",
      description: "Get personalized coaching and strategic guidance",
      icon: MessageSquare,
      route: "/coaches-corner",
      gradient: "from-pink-500/10 to-rose-600/20 hover:from-pink-500/20 hover:to-rose-600/30",
      iconBg: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
      stats: [
        { label: "Total Conversations", value: coachingStats?.totalConversations || 0 },
        { label: "Starred", value: coachingStats?.starredConversations || 0 },
        { label: "Active Sessions", value: coachingStats?.totalConversations ? Math.min(3, coachingStats.totalConversations) : 0 },
      ],
    },
    {
      title: "Knowledge Library",
      description: "Access playbooks, guides, and learning resources",
      icon: BookOpen,
      route: "/knowledge-base",
      gradient: "from-purple-500/10 to-indigo-600/20 hover:from-purple-500/20 hover:to-indigo-600/30",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      stats: [
        { label: "Categories", value: knowledgeStats?.totalCategories || 0 },
        { label: "Playbooks", value: knowledgeStats?.totalPlaybooks || 0 },
        { label: "Completed", value: knowledgeStats?.completedCards || 0 },
      ],
    },
    {
      title: "AI Roleplaying",
      description: "Practice sales conversations with AI prospects",
      icon: Mic2,
      route: "/role-playing",
      gradient: "from-emerald-500/10 to-teal-600/20 hover:from-emerald-500/20 hover:to-teal-600/30",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      stats: [
        { label: "Scenarios", value: roleplayStats?.totalScenarios || 0 },
        { label: "Completed", value: roleplayStats?.completedSessions || 0 },
        { label: "Avg Rating", value: roleplayStats?.avgRating ? roleplayStats.avgRating.toFixed(1) : "—" },
      ],
    },
    {
      title: "Feedback Centre",
      description: "Report bugs, suggest features, and help us improve",
      icon: MessageSquarePlus,
      route: "/feedback-centre",
      gradient: "from-amber-500/10 to-orange-600/20 hover:from-amber-500/20 hover:to-orange-600/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      stats: [
        { label: "Your Bug Reports", value: feedbackStats?.bugReports || 0 },
        { label: "Feature Requests", value: feedbackStats?.featureRequests || 0 },
        { label: "Bug Hunter Points", value: feedbackStats?.points || 0 },
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 bg-gradient-to-br ${card.gradient}`}
              onClick={() => navigate(card.route)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-8 w-8 ${card.iconColor}`} />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {card.description}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  {card.stats.map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

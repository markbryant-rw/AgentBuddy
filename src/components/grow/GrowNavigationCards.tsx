import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, Mic2, ArrowRight, MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function GrowNavigationCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Fetch feedback stats
  const { data: feedbackStats } = useQuery({
    queryKey: ["feedback-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { bugReports: 0, featureRequests: 0, points: 0 };
      
      const [bugCount, featureCount, profile] = await Promise.all([
        (supabase as any).from('bug_reports').select('id').eq('user_id', user.id),
        (supabase as any).from('feature_requests').select('id').eq('user_id', user.id),
        (supabase as any).from('profiles').select('total_bug_points').eq('id', user.id).single(),
      ]);

      return {
        bugReports: bugCount.data?.length || 0,
        featureRequests: featureCount.data?.length || 0,
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
      comingSoon: true,
      stats: [
        { label: "Total Conversations", value: "—" },
        { label: "Starred", value: "—" },
        { label: "Active Sessions", value: "—" },
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
      comingSoon: true,
      stats: [
        { label: "Categories", value: "—" },
        { label: "Playbooks", value: "—" },
        { label: "Completed", value: "—" },
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
      comingSoon: true,
      stats: [
        { label: "Scenarios", value: "—" },
        { label: "Completed", value: "—" },
        { label: "Avg Rating", value: "—" },
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
      comingSoon: false,
      stats: [
        { label: "Your Bug Reports", value: feedbackStats?.bugReports || 0 },
        { label: "Feature Requests", value: feedbackStats?.featureRequests || 0 },
        { label: "Bug Hunter Points", value: feedbackStats?.points || 0 },
      ],
    },
  ];

  const handleCardClick = (card: typeof cards[0]) => {
    if (card.comingSoon) {
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(card.title)) {
          newSet.delete(card.title);
        } else {
          newSet.add(card.title);
        }
        return newSet;
      });
    } else {
      navigate(card.route);
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-fluid-lg">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isFlipped = flippedCards.has(card.title);
        
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="perspective-1000"
            style={{ perspective: "1000px" }}
          >
            <motion.div
              className="relative w-full h-full"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front of card */}
              <Card 
                className={`group cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 bg-gradient-to-br ${card.gradient} backface-hidden`}
                onClick={() => handleCardClick(card)}
                style={{ backfaceVisibility: "hidden" }}
              >
                <CardContent className="p-fluid-lg">
                  <div className="flex items-start justify-between mb-fluid-md">
                    <div className={`p-3 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-icon-lg w-icon-lg ${card.iconColor}`} />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="h-icon-sm w-icon-sm" />
                    </Button>
                  </div>
                  
                  <h3 className="text-fluid-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-fluid-sm text-muted-foreground mb-fluid-md">
                    {card.description}
                  </p>

                  <div className="grid grid-cols-3 gap-fluid-sm pt-fluid-md border-t">
                    {card.stats.map((stat, idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-fluid-2xl font-bold">{stat.value}</div>
                        <div className="text-fluid-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Back of card (Coming Soon) */}
              {card.comingSoon && (
                <Card 
                  className={`absolute inset-0 cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 bg-gradient-to-br ${card.gradient}`}
                  onClick={() => handleCardClick(card)}
                  style={{ 
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)"
                  }}
                >
                  <CardContent className="p-fluid-lg h-full flex flex-col items-center justify-center text-center">
                    <div className={`p-fluid-md rounded-xl ${card.iconBg} mb-fluid-md`}>
                      <Icon className={`h-icon-xl w-icon-xl ${card.iconColor}`} />
                    </div>
                    <h3 className="text-fluid-2xl font-bold mb-2">{card.title}</h3>
                    <p className="text-fluid-lg text-muted-foreground mb-fluid-md">Coming Soon</p>
                    <p className="text-fluid-sm text-muted-foreground">
                      We're working hard to bring you this feature. Stay tuned!
                    </p>
                    <p className="text-fluid-xs text-muted-foreground/60 mt-fluid-lg">
                      Click anywhere to flip back
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

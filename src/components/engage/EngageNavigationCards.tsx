import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Trophy, MessageSquare, Briefcase, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useServiceProviders } from '@/hooks/directory/useServiceProviders';

export function EngageNavigationCards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [clickedCard, setClickedCard] = useState<string | null>(null);

  // Fetch social feed stats
  const { data: feedStats } = useQuery({
    queryKey: ['social-feed-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalPosts: 0, weekPosts: 0 };
      
      const { data, error } = await supabase
        .from('social_posts')
        .select('created_at', { count: 'exact' });
      
      if (error) throw error;
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weekPosts = data?.filter(post => 
        new Date(post.created_at) >= oneWeekAgo
      ).length || 0;
      
      return {
        totalPosts: data?.length || 0,
        weekPosts,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch service provider stats
  const { data: providers = [] } = useServiceProviders();

  const handleCardClick = (route: string) => {
    setClickedCard(route);
    startTransition(() => {
      navigate(route);
    });
  };

  const cards = [
    {
      title: 'Leaderboards',
      description: 'See how you rank against your team and friends',
      icon: Trophy,
      route: '/engage/leaderboards',
      gradient: 'from-amber-500/10 to-yellow-600/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      stats: [
        { label: 'Weekly Rank', value: '—' },
        { label: 'Top Score', value: '—' },
        { label: 'Your Score', value: '—' },
      ],
    },
    {
      title: 'Social Feed',
      description: 'Share wins, celebrate team, stay connected',
      icon: MessageSquare,
      route: '/engage/feed',
      gradient: 'from-blue-500/10 to-cyan-600/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      stats: [
        { label: 'Team Posts', value: feedStats?.totalPosts || 0 },
        { label: 'This Week', value: feedStats?.weekPosts || 0 },
        { label: 'Your Posts', value: '—' },
      ],
    },
    {
      title: 'Service Providers',
      description: 'Your trusted network of professionals',
      icon: Briefcase,
      route: '/systems/directory',
      gradient: 'from-teal-500/10 to-emerald-600/20',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      stats: [
        { label: 'Total Providers', value: providers.length },
        { label: 'Categories', value: new Set(providers.map(p => p.category_id || p.team_category_id).filter(Boolean)).size },
        { label: 'Rated', value: providers.filter(p => p.total_reviews > 0).length },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.route}
            className={cn(
              'group relative overflow-hidden cursor-pointer',
              'hover:shadow-xl transition-all duration-200',
              'border-l-4 border-l-teal-500',
              clickedCard === card.route && 'opacity-70 scale-[0.98]'
            )}
            onClick={() => handleCardClick(card.route)}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
            
            <div className="relative p-6 space-y-4">
              {/* Icon & Title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-3 rounded-lg', card.iconBg)}>
                    <Icon className={cn('h-6 w-6', card.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="text-lg font-bold">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* View Indicator */}
              <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                <span>Click to view</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

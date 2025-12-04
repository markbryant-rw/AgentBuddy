import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, MessageSquare, Briefcase, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { useServiceProviders } from '@/hooks/directory/useServiceProviders';

export function EngageNavigationCards() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [clickedCard, setClickedCard] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Fetch service provider stats
  const { data: providers = [] } = useServiceProviders();

  const handleCardClick = (route: string, comingSoon?: boolean) => {
    if (comingSoon) {
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(route)) {
          newSet.delete(route);
        } else {
          newSet.add(route);
        }
        return newSet;
      });
      return;
    }
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
      comingSoon: true,
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
      comingSoon: true,
      stats: [
        { label: 'Team Posts', value: '—' },
        { label: 'This Week', value: '—' },
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
      comingSoon: false,
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
        const isFlipped = flippedCards.has(card.route);

        return (
          <div key={card.route} className="perspective-1000 h-[280px]">
            <motion.div
              className="relative w-full h-full"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front Side */}
              <Card
                className={cn(
                  'absolute inset-0 group overflow-hidden cursor-pointer',
                  'hover:shadow-xl transition-all duration-200',
                  'border-l-4 border-l-teal-500',
                  clickedCard === card.route && 'opacity-70 scale-[0.98]',
                  card.comingSoon && 'opacity-80'
                )}
                style={{ backfaceVisibility: "hidden" }}
                onClick={() => handleCardClick(card.route, card.comingSoon)}
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
                    <span>{card.comingSoon ? 'Coming Soon' : 'Click to view'}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>

              {/* Back Side (Coming Soon) */}
              {card.comingSoon && (
                <Card
                  className={cn(
                    'absolute inset-0 overflow-hidden cursor-pointer',
                    'border-l-4 border-l-teal-500'
                  )}
                  style={{ 
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)"
                  }}
                  onClick={() => handleCardClick(card.route, card.comingSoon)}
                >
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
                  <CardContent className="relative h-full flex flex-col items-center justify-center text-center p-6">
                    <div className={cn('p-4 rounded-xl mb-4', card.iconBg)}>
                      <Icon className={cn('h-10 w-10', card.iconColor)} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
                    <p className="text-lg text-muted-foreground mb-4">Coming Soon</p>
                    <p className="text-sm text-muted-foreground">
                      We're working hard to bring you this feature. Stay tuned!
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-6">
                      Click anywhere to flip back
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

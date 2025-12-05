import { Trophy, MessageSquare, Briefcase } from 'lucide-react';
import { useServiceProviders } from '@/hooks/directory/useServiceProviders';
import { WorkspaceCard } from '@/components/ui/workspace-card';

export function EngageNavigationCards() {
  // Fetch service provider stats
  const { data: providers = [] } = useServiceProviders();

  const cards = [
    {
      title: 'Leaderboards',
      description: 'See how you rank against your team and friends',
      icon: Trophy,
      route: '/engage/leaderboards',
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
      comingSoon: false,
      stats: [
        { label: 'Total Providers', value: providers.length },
        {
          label: 'Categories',
          value: new Set(
            providers.map((p) => p.category_id || p.team_category_id).filter(Boolean)
          ).size,
        },
        { label: 'Rated', value: providers.filter((p) => p.total_reviews > 0).length },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-fluid-lg">
      {cards.map((card) => (
        <WorkspaceCard
          key={card.route}
          workspace="engage"
          title={card.title}
          description={card.description}
          icon={card.icon}
          route={card.route}
          stats={card.stats}
          comingSoon={card.comingSoon}
        />
      ))}
    </div>
  );
}

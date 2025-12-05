import { FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { useMemo } from 'react';
import { WorkspaceCard } from '@/components/ui/workspace-card';

interface ProspectNavigationCardsProps {
  appraisals: LoggedAppraisal[];
  listings: Listing[];
  appraisalStats: {
    total: number;
    active: number;
    converted: number;
  };
  pipelineStats: {
    total: number;
    hot: number;
    warm: number;
    cold: number;
  };
}

const ProspectNavigationCards = ({
  appraisals,
  listings,
  appraisalStats,
  pipelineStats,
}: ProspectNavigationCardsProps) => {
  // Calculate analytics stats
  const analyticsStats = useMemo(() => {
    const wonListings = listings.filter((l) => l.outcome === 'won');
    const totalWithOutcome = listings.filter(
      (l) => l.outcome === 'won' || l.outcome === 'lost'
    ).length;
    const winRate =
      totalWithOutcome > 0 ? Math.round((wonListings.length / totalWithOutcome) * 100) : 0;

    const totalValue = listings
      .filter((l) => l.outcome !== 'lost' && l.outcome !== 'won')
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    return { winRate, totalValue };
  }, [listings]);

  const cards = [
    {
      title: 'View Appraisals',
      description: 'Manage all appraisals, track warmth and follow-ups',
      icon: FileText,
      route: '/prospect-dashboard/appraisals',
      stats: [
        { label: 'Total Appraisals', value: appraisalStats.total },
        { label: 'Active', value: appraisalStats.active },
        { label: 'Converted', value: appraisalStats.converted },
      ],
    },
    {
      title: 'View Pipeline',
      description: 'Track opportunities and forecast closings',
      icon: TrendingUp,
      route: '/prospect-dashboard/pipeline',
      stats: [
        { label: 'Active Opportunities', value: pipelineStats.total },
        { label: 'Hot', value: pipelineStats.hot },
        { label: 'Warm', value: pipelineStats.warm },
      ],
    },
    {
      title: 'View Analytics',
      description: 'Comprehensive insights and performance trends',
      icon: BarChart3,
      route: '/prospect-dashboard/analytics',
      stats: [
        { label: 'Win Rate', value: `${analyticsStats.winRate}%` },
        { label: 'Pipeline Value', value: `$${(analyticsStats.totalValue / 1000000).toFixed(1)}M` },
        { label: 'Opportunities', value: pipelineStats.total },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-fluid-lg">
      {cards.map((card) => (
        <WorkspaceCard
          key={card.route}
          workspace="prospect"
          title={card.title}
          description={card.description}
          icon={card.icon}
          route={card.route}
          stats={card.stats}
        />
      ))}
    </div>
  );
};

export default ProspectNavigationCards;

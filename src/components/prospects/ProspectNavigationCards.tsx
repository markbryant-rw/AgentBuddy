import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { useMemo } from 'react';

interface NavigationCardProps {
  title: string;
  description: string;
  icon: typeof FileText;
  route: string;
  primaryStat: string;
  primaryLabel: string;
  secondaryStats?: { label: string; value: string | number }[];
  gradient: string;
}

const NavigationCard = ({ 
  title, 
  description, 
  icon: Icon, 
  route, 
  primaryStat, 
  primaryLabel,
  secondaryStats,
  gradient 
}: NavigationCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(route)}
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
        "border-l-4 group min-h-[200px]"
      )}
    >
      <CardContent className="p-fluid-lg">
        <div className="flex items-start justify-between mb-fluid-md">
          <div className={cn("p-3 rounded-lg", gradient)}>
            <Icon className="h-icon-md w-icon-md text-primary" />
          </div>
          <ArrowRight className="h-icon-sm w-icon-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="text-fluid-xl font-bold mb-2">{title}</h3>
        <p className="text-fluid-sm text-muted-foreground mb-fluid-md">{description}</p>
        
        {/* Primary Stat */}
        <div className="space-y-1 mb-3">
          <div className="text-fluid-4xl font-bold text-primary">{primaryStat}</div>
          <div className="text-fluid-xs text-muted-foreground uppercase tracking-wide">{primaryLabel}</div>
        </div>

        {/* Secondary Stats */}
        {secondaryStats && secondaryStats.length > 0 && (
          <div className="flex gap-fluid-md text-fluid-sm">
            {secondaryStats.map((stat, index) => (
              <div key={stat.label}>
                <span className="font-semibold text-foreground">{stat.value}</span>
                <span className="text-muted-foreground ml-1">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
  pipelineStats 
}: ProspectNavigationCardsProps) => {
  // Calculate analytics stats
  const analyticsStats = useMemo(() => {
    const wonListings = listings.filter(l => l.outcome === 'won');
    const totalWithOutcome = listings.filter(l => l.outcome === 'won' || l.outcome === 'lost').length;
    const winRate = totalWithOutcome > 0 ? Math.round((wonListings.length / totalWithOutcome) * 100) : 0;
    
    const totalValue = listings
      .filter(l => l.outcome !== 'lost' && l.outcome !== 'won')
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    
    return { winRate, totalValue };
  }, [listings]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-fluid-lg">
      <NavigationCard
        title="View Appraisals"
        description="Manage all appraisals, track warmth and follow-ups"
        icon={FileText}
        route="/prospect-dashboard/appraisals"
        primaryStat={appraisalStats.total.toString()}
        primaryLabel="Total Appraisals"
        secondaryStats={[
          { label: 'Active', value: appraisalStats.active },
          { label: 'Converted', value: appraisalStats.converted }
        ]}
        gradient="bg-purple-100 dark:bg-purple-900/30"
      />
      <NavigationCard
        title="View Pipeline"
        description="Track opportunities and forecast closings"
        icon={TrendingUp}
        route="/prospect-dashboard/pipeline"
        primaryStat={pipelineStats.total.toString()}
        primaryLabel="Active Opportunities"
        secondaryStats={[
          { label: 'Hot', value: pipelineStats.hot },
          { label: 'Warm', value: pipelineStats.warm }
        ]}
        gradient="bg-blue-100 dark:bg-blue-900/30"
      />
      <NavigationCard
        title="View Analytics"
        description="Comprehensive insights and performance trends"
        icon={BarChart3}
        route="/prospect-dashboard/analytics"
        primaryStat={`${analyticsStats.winRate}%`}
        primaryLabel="Win Rate"
        secondaryStats={[
          { label: 'Pipeline Value', value: `$${(analyticsStats.totalValue / 1000000).toFixed(1)}M` }
        ]}
        gradient="bg-green-100 dark:bg-green-900/30"
      />
    </div>
  );
};

export default ProspectNavigationCards;

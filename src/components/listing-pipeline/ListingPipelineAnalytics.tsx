import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, Calendar, Award } from 'lucide-react';
import { Listing } from '@/hooks/useListingPipeline';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ListingPipelineAnalyticsProps {
  listings: Listing[];
}

export const ListingPipelineAnalytics = ({ listings }: ListingPipelineAnalyticsProps) => {
  // Calculate metrics
  const totalValue = listings.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const totalLeads = listings.filter(l => l.stage === 'call' || !l.stage).length;
  const totalWon = listings.filter(l => l.outcome === 'won').length;
  const conversionRate = totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0;

  const avgDaysToSign = listings
    .filter(l => l.contract_signed_date && l.appraisal_date)
    .reduce((sum, l) => {
      const days = Math.floor(
        (new Date(l.contract_signed_date!).getTime() - new Date(l.appraisal_date!).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0) / Math.max(1, listings.filter(l => l.contract_signed_date && l.appraisal_date).length);

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const quarterListings = listings.filter(l => {
    if (!l.expected_month) return false;
    const month = new Date(l.expected_month).getMonth() + 1;
    return Math.ceil(month / 3) === currentQuarter;
  }).length;

  // Group by warmth for distribution
  const warmthDistribution = {
    hot: listings.filter(l => l.warmth === 'hot').length,
    warm: listings.filter(l => l.warmth === 'warm').length,
    cold: listings.filter(l => l.warmth === 'cold').length,
  };

  const stats = [
    {
      title: 'Pipeline Value',
      value: `$${(totalValue / 1000000).toFixed(1)}M`,
      change: '+18%',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Total estimated value',
    },
    {
      title: 'Conversion Rate',
      value: `${conversionRate.toFixed(0)}%`,
      subtitle: 'Lead → Won',
      icon: TrendingUp,
      description: `${totalWon} won from ${totalLeads} leads`,
    },
    {
      title: 'Avg Days to Sign',
      value: avgDaysToSign > 0 ? `${avgDaysToSign.toFixed(0)} days` : 'N/A',
      change: avgDaysToSign > 0 ? '-5 days' : undefined,
      trend: 'up' as const,
      icon: Calendar,
      description: 'From appraisal to contract',
    },
    {
      title: 'Active This Quarter',
      value: `${quarterListings}`,
      subtitle: `Q${currentQuarter} ${new Date().getFullYear()}`,
      icon: Target,
      description: 'Expected this quarter',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
            )}
            {stat.change && (
              <Badge
                variant="secondary"
                className={`mt-2 ${
                  stat.trend === 'up'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                {stat.change}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

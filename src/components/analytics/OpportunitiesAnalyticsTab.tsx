import { useMemo } from 'react';
import { Listing } from '@/hooks/useListingPipeline';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Percent, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { formatCurrency, calculateGCI } from '@/lib/currencyUtils';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { STAGE_COLORS } from '@/lib/stageColors';

interface OpportunitiesAnalyticsTabProps {
  listings: Listing[];
}

export const OpportunitiesAnalyticsTab = ({ listings }: OpportunitiesAnalyticsTabProps) => {
  const { currentQuarter, getQuarterInfo } = useFinancialYear();

  // Hero Metrics - Optimized: Single pass instead of multiple filters
  const heroMetrics = useMemo(() => {
    const now = new Date();
    const currentQInfo = getQuarterInfo(currentQuarter.quarter, currentQuarter.year);

    // Single pass through listings to calculate all metrics
    const metrics = listings.reduce((acc, l) => {
      const date = new Date(l.expected_month);
      const isThisQuarter = date >= currentQInfo.startDate && date <= currentQInfo.endDate;
      const isActive = !l.archived_at && l.outcome !== 'lost';
      const isWon = l.outcome === 'won';
      const isLost = l.outcome === 'lost';

      if (isThisQuarter) {
        acc.thisQuarterCount++;
        if (l.outcome !== 'lost') {
          acc.pipelineValue += (l.estimated_value || 0);
        }
      }

      if (isActive) {
        acc.activeCount++;
        if (l.warmth === 'hot') acc.hotCount++;
        if (l.warmth === 'warm') acc.warmCount++;

        // Stage distribution
        if (l.stage === 'call') acc.callCount++;
        else if (l.stage === 'vap') acc.vapCount++;
        else if (l.stage === 'map') acc.mapCount++;
        else if (l.stage === 'lap') acc.lapCount++;
      }

      if (isWon) {
        acc.wonCount++;
        acc.wonValueSum += (l.estimated_value || 0);
      }
      if (isLost) acc.lostCount++;

      return acc;
    }, {
      thisQuarterCount: 0,
      pipelineValue: 0,
      activeCount: 0,
      hotCount: 0,
      warmCount: 0,
      callCount: 0,
      vapCount: 0,
      mapCount: 0,
      lapCount: 0,
      wonCount: 0,
      wonValueSum: 0,
      lostCount: 0,
    });

    const winRate = metrics.wonCount + metrics.lostCount > 0
      ? Math.round((metrics.wonCount / (metrics.wonCount + metrics.lostCount)) * 100)
      : 0;

    const avgDealSize = metrics.wonCount > 0
      ? metrics.wonValueSum / metrics.wonCount
      : 0;

    const stageDistribution = {
      call: metrics.callCount,
      vap: metrics.vapCount,
      map: metrics.mapCount,
      lap: metrics.lapCount,
      won: metrics.wonCount,
    };

    return {
      pipelineValue: metrics.pipelineValue,
      winRate,
      activeCount: metrics.activeCount,
      avgDealSize,
      hotCount: metrics.hotCount,
      warmCount: metrics.warmCount,
      stageDistribution,
    };
  }, [listings, currentQuarter, getQuarterInfo]);

  // Quarterly Pipeline Overview
  const quarterlyData = useMemo(() => {
    const quarters = [];
    for (let i = 0; i < 4; i++) {
      let q = currentQuarter.quarter + i;
      let y = currentQuarter.year;
      
      while (q > 4) {
        q -= 4;
        y += 1;
      }
      
      const qInfo = getQuarterInfo(q, y);
      const quarterListings = listings.filter(l => {
        const date = new Date(l.expected_month);
        return date >= qInfo.startDate && date <= qInfo.endDate;
      });

      quarters.push({
        label: qInfo.label,
        count: quarterListings.length,
        value: quarterListings.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
        isCurrent: q === currentQuarter.quarter && y === currentQuarter.year,
      });
    }
    return quarters;
  }, [listings, currentQuarter, getQuarterInfo]);

  // Stage Funnel
  const stageFunnel = useMemo(() => {
    const stages = ['call', 'vap', 'map', 'lap', 'won'] as const;
    const totalListings = listings.filter(l => !l.archived_at).length;
    
    return stages.map(stage => {
      const count = listings.filter(l => l.stage === stage).length;
      return {
        stage: STAGE_COLORS[stage].label,
        count,
        percentage: totalListings > 0 ? ((count / totalListings) * 100).toFixed(1) : 0,
      };
    });
  }, [listings]);

  // Win/Loss Over Time
  const winLossData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        won: 0,
        lost: 0,
      };
    });

    listings.forEach(listing => {
      if (listing.outcome === 'won' || listing.outcome === 'lost') {
        const dateField = listing.outcome === 'won' ? listing.contract_signed_date : listing.lost_date;
        if (dateField) {
          const date = new Date(dateField);
          const monthIndex = last6Months.findIndex(m => {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() - (5 - last6Months.indexOf(m)));
            return targetDate.getMonth() === date.getMonth() && 
                   targetDate.getFullYear() === date.getFullYear();
          });

          if (monthIndex >= 0) {
            last6Months[monthIndex][listing.outcome]++;
          }
        }
      }
    });

    return last6Months.map(month => ({
      ...month,
      winRate: month.won + month.lost > 0 
        ? Math.round((month.won / (month.won + month.lost)) * 100)
        : 0,
    }));
  }, [listings]);

  // Deal Velocity
  const dealVelocity = useMemo(() => {
    const wonListings = listings.filter(l => l.outcome === 'won' && l.contract_signed_date && l.last_contact);
    
    if (wonListings.length === 0) return null;

    const totalDays = wonListings.reduce((sum, l) => {
      const start = new Date(l.last_contact!);
      const end = new Date(l.contract_signed_date!);
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round(totalDays / wonListings.length);
  }, [listings]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(heroMetrics.pipelineValue)}
          description="This quarter's opportunities"
          icon={DollarSign}
        />
        <StatCard
          title="Win Rate"
          value={`${heroMetrics.winRate}%`}
          description="Closed opportunities won"
          icon={Percent}
        />
        <StatCard
          title="Active Opportunities"
          value={heroMetrics.activeCount}
          description={`${heroMetrics.hotCount} hot · ${heroMetrics.warmCount} warm`}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Deal Size"
          value={formatCurrency(heroMetrics.avgDealSize)}
          description="Won listings average value"
          icon={DollarSign}
        />
      </div>

      {/* Study Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quarterly Pipeline Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quarterly Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'value') return [formatCurrency(value), 'Pipeline Value'];
                    return [value, 'Count'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" name="Opportunity Count" />
                <Bar yAxisId="right" dataKey="value" fill="hsl(var(--chart-2))" name="Pipeline Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Funnel Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageFunnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === 'count') {
                      return [`${value} (${props.payload.percentage}%)`, 'Count'];
                    }
                    return value;
                  }}
                />
                <Bar dataKey="count">
                  {stageFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.stage.toLowerCase().replace(/\//g, '') as keyof typeof STAGE_COLORS]?.hex || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win/Loss Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Win/Loss Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={winLossData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="won" fill={STAGE_COLORS.won.hex} name="Won" />
                <Bar yAxisId="left" dataKey="lost" fill={STAGE_COLORS.lost.hex} name="Lost" />
                <Line yAxisId="right" type="monotone" dataKey="winRate" stroke="hsl(var(--primary))" strokeWidth={2} name="Win Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Velocity */}
        {dealVelocity !== null && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Deal Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p className="text-5xl font-bold mb-2">{dealVelocity}</p>
                  <p className="text-xl text-muted-foreground">Average days from first contact to won</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

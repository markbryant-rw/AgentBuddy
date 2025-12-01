import { useMemo } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Flame, Calendar, Snowflake } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AppraisalsAnalyticsTabProps {
  appraisals: LoggedAppraisal[];
  opportunities: Listing[];
}

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#6b7280'];
const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  converted: '#10b981',
  lost: '#ef4444',
  archived: '#6b7280',
};

export const AppraisalsAnalyticsTab = ({ appraisals, opportunities }: AppraisalsAnalyticsTabProps) => {
  const heroMetrics = useMemo(() => {
    const totalAppraisals = appraisals.length;
    const convertedAppraisals = appraisals.filter(a => a.outcome === 'WON').length;
    const conversionRate = totalAppraisals > 0 ? ((convertedAppraisals / totalAppraisals) * 100).toFixed(1) : 0;
    const activeAppraisals = appraisals.filter(a => a.outcome === 'In Progress');
    const highCount = activeAppraisals.filter(a => a.intent === 'high').length;
    const mediumCount = activeAppraisals.filter(a => a.intent === 'medium').length;
    const lowCount = activeAppraisals.filter(a => a.intent === 'low').length;
    const followUpsDue = appraisals.filter(a => {
      if (!a.next_follow_up || a.outcome !== 'In Progress') return false;
      const followUpDate = new Date(a.next_follow_up);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return followUpDate <= weekFromNow;
    }).length;

    return {
      totalAppraisals,
      conversionRate,
      activeAppraisals: activeAppraisals.length,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      followUpsDue,
    };
  }, [appraisals]);

  const appraisalsByMonth = useMemo(() => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        high: 0,
        medium: 0,
        low: 0,
      };
    });

    appraisals.forEach(appraisal => {
      const date = new Date(appraisal.appraisal_date);
      const monthIndex = last12Months.findIndex(m => {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - (11 - last12Months.indexOf(m)));
        return targetDate.getMonth() === date.getMonth() && 
               targetDate.getFullYear() === date.getFullYear();
      });

      if (monthIndex >= 0) {
        last12Months[monthIndex][appraisal.intent]++;
      }
    });

    return last12Months;
  }, [appraisals]);

  const conversionByIntent = useMemo(() => {
    return ['high', 'medium', 'low'].map(intent => {
      const total = appraisals.filter(a => a.intent === intent).length;
      const converted = appraisals.filter(a => a.intent === intent && a.outcome === 'WON').length;
      return {
        name: intent.charAt(0).toUpperCase() + intent.slice(1),
        rate: total > 0 ? Math.round((converted / total) * 100) : 0,
      };
    });
  }, [appraisals]);

  const outcomeBreakdown = useMemo(() => {
    return [
      { name: 'In Progress', value: appraisals.filter(a => a.outcome === 'In Progress').length },
      { name: 'WON', value: appraisals.filter(a => a.outcome === 'WON').length },
      { name: 'LOST', value: appraisals.filter(a => a.outcome === 'LOST').length },
    ].filter(item => item.value > 0);
  }, [appraisals]);

  const appraisalsBySuburb = useMemo(() => {
    const suburbCounts: Record<string, number> = {};
    
    appraisals.forEach(appraisal => {
      const suburb = (appraisal.suburb || 'Unknown').trim();
      if (suburb && suburb !== 'Unknown') {
        suburbCounts[suburb] = (suburbCounts[suburb] || 0) + 1;
      }
    });

    return Object.entries(suburbCounts)
      .map(([suburb, count]) => ({ suburb, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Show top 15 suburbs
  }, [appraisals]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Appraisals" value={heroMetrics.totalAppraisals} description="All appraisals logged" icon={FileText} trend={{ value: 0, isPositive: true }} />
        <StatCard title="Conversion Rate" value={`${heroMetrics.conversionRate}%`} description="Appraisals converted to listings" icon={TrendingUp} trend={{ value: 0, isPositive: true }} />
        <StatCard title="Active Appraisals" value={heroMetrics.activeAppraisals} description="Currently in progress" icon={FileText} trend={{ value: 0, isPositive: true }} />
        <StatCard title="Follow-ups Due" value={heroMetrics.followUpsDue} description="Within next 7 days" icon={Calendar} trend={{ value: 0, isPositive: false }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="High Intent" value={heroMetrics.high} description="Ready to list soon" icon={Flame} trend={{ value: 0, isPositive: true }} />
        <StatCard title="Medium Intent" value={heroMetrics.medium} description="Considering listing" icon={TrendingUp} trend={{ value: 0, isPositive: true }} />
        <StatCard title="Low Intent" value={heroMetrics.low} description="Exploring options" icon={Snowflake} trend={{ value: 0, isPositive: false }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appraisal Volume Trend</CardTitle>
            <CardDescription>Last 12 months by intent</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={appraisalsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} name="High" />
                <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} name="Medium" />
                <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} name="Low" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate by Intent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionByIntent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#10b981" name="Conversion %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={outcomeBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {outcomeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Suburb Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Appraisals by Suburb</CardTitle>
          <CardDescription>Top suburbs by appraisal volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={appraisalsBySuburb} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="suburb" width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Appraisals" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

import { useMemo } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Listing } from '@/hooks/useListingPipeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

interface ProspectAnalyticsProps {
  appraisals: LoggedAppraisal[];
  opportunities: Listing[];
}

const ProspectAnalytics = ({ appraisals, opportunities }: ProspectAnalyticsProps) => {
  const appraisalsByMonth = useMemo(() => {
    const monthData: Record<string, any> = {};
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yy');
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthAppraisals = appraisals.filter(a => {
        const appraisalDate = new Date(a.appraisal_date);
        return appraisalDate >= monthStart && appraisalDate <= monthEnd;
      });
      monthData[monthKey] = {
        month: monthKey,
        total: monthAppraisals.length,
        high: monthAppraisals.filter(a => a.intent === 'high').length,
        medium: monthAppraisals.filter(a => a.intent === 'medium').length,
        low: monthAppraisals.filter(a => a.intent === 'low').length,
      };
    }
    return Object.values(monthData);
  }, [appraisals]);

  const appraisalsBySuburb = useMemo(() => {
    const suburbCounts: Record<string, number> = {};
    
    appraisals.forEach(appraisal => {
      const suburb = (appraisal.suburb || 'Unknown').trim();
      if (suburb) {
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
      <Card>
        <CardHeader>
          <CardTitle>Appraisal Trends</CardTitle>
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
              <Line type="monotone" dataKey="high" stroke="#ef4444" name="High" strokeWidth={2} />
              <Line type="monotone" dataKey="medium" stroke="#f59e0b" name="Medium" strokeWidth={2} />
              <Line type="monotone" dataKey="low" stroke="#3b82f6" name="Low" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Appraisals" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspectAnalytics;

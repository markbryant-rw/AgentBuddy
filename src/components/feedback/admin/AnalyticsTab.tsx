import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bug, Lightbulb, TrendingUp, Clock, Award } from "lucide-react";

export function AnalyticsTab() {
  // Fetch bug statistics
  const { data: bugStats } = useQuery({
    queryKey: ['bug-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('status, severity, created_at, fixed_at');
      
      if (error) throw error;

      const statusCounts = data.reduce((acc, bug) => {
        acc[bug.status] = (acc[bug.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const severityCounts = data.reduce((acc, bug) => {
        acc[bug.severity || 'unknown'] = (acc[bug.severity || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average resolution time
      const fixedBugs = data.filter(b => b.fixed_at && b.status === 'fixed');
      const avgResolutionTime = fixedBugs.length > 0
        ? fixedBugs.reduce((sum, bug) => {
            const created = new Date(bug.created_at).getTime();
            const fixed = new Date(bug.fixed_at!).getTime();
            return sum + (fixed - created);
          }, 0) / fixedBugs.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        total: data.length,
        statusCounts,
        severityCounts,
        avgResolutionTime: avgResolutionTime.toFixed(1),
      };
    },
  });

  // Fetch feature request statistics
  const { data: featureStats } = useQuery({
    queryKey: ['feature-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('status, vote_count');
      
      if (error) throw error;

      const statusCounts = data.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalVotes = data.reduce((sum, req) => sum + req.vote_count, 0);

      return {
        total: data.length,
        statusCounts,
        totalVotes,
      };
    },
  });

  // Fetch top bug reporters
  const { data: topReporters } = useQuery({
    queryKey: ['top-bug-reporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('user_id')
        .not('user_id', 'is', null);
      
      if (error) throw error;
      
      // Count reports per user
      const userCounts: Record<string, number> = {};
      data.forEach(bug => {
        if (bug.user_id) {
          userCounts[bug.user_id] = (userCounts[bug.user_id] || 0) + 1;
        }
      });
      
      // Get top 5 user IDs
      const topUserIds = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);
      
      // Fetch profile data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', topUserIds);
      
      return topUserIds.map(userId => ({
        id: userId,
        full_name: profiles?.find(p => p.id === userId)?.full_name || 'Unknown',
        count: userCounts[userId]
      }));
    },
  });

  const bugStatusData = bugStats ? Object.entries(bugStats.statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })) : [];

  const featureStatusData = featureStats ? Object.entries(featureStats.statusCounts).map(([name, value]) => ({
    name: name.replace('_', ' ').charAt(0).toUpperCase() + name.replace('_', ' ').slice(1),
    value,
  })) : [];

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6b7280', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bug Reports</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bugStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featureStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bugStats?.avgResolutionTime || 0} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featureStats?.totalVotes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bug Reports by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Bug Reports by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bugStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bugStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Requests by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Requests by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={featureStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Bug Hunters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Top Bug Hunters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topReporters?.map((reporter, index) => (
              <div key={reporter.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{reporter.full_name}</span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {reporter.count} reports
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

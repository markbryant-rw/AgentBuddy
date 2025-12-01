import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, Star } from 'lucide-react';

export function BugIntelligenceTab() {
  const { data: volumeByModule } = useQuery({
    queryKey: ['bug-volume-by-module'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bug_reports')
        .select('workspace_module, module');
      
      const counts = (data || []).reduce((acc, bug) => {
        const mod = bug.workspace_module || bug.module || 'General';
        acc[mod] = (acc[mod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    },
  });

  const { data: satisfactionData } = useQuery({
    queryKey: ['bug-satisfaction-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bug_reports')
        .select('satisfaction_rating, workspace_module')
        .not('satisfaction_rating', 'is', null);

      const byModule = (data || []).reduce((acc, bug) => {
        const mod = bug.workspace_module || 'General';
        if (!acc[mod]) acc[mod] = { total: 0, sum: 0 };
        acc[mod].total++;
        acc[mod].sum += bug.satisfaction_rating || 0;
        return acc;
      }, {} as Record<string, { total: number; sum: number }>);

      return Object.entries(byModule).map(([name, stats]) => ({
        name,
        avgRating: (stats.sum / stats.total).toFixed(1),
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Bug Volume by Workspace/Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={volumeByModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Satisfaction Scores by Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={satisfactionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="avgRating" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
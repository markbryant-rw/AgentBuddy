import { Card } from '@/components/ui/card';
import { Activity, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export const PlatformActivityWidget = () => {
  const { data: activity, isLoading } = useQuery({
    queryKey: ['platform-activity-widget'],
    queryFn: async () => {
      const [users, messages, logins] = await Promise.all([
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }),
        (supabase as any).from('messages').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        (supabase as any).from('admin_activity_log').select('id', { count: 'exact', head: true }).eq('action', 'login').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        totalUsers: users.count || 0,
        messages24h: messages.count || 0,
        logins24h: logins.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Platform Activity</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <div className="text-xl font-bold">{activity?.totalUsers}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
        <div className="text-center">
          <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <div className="text-xl font-bold">{activity?.messages24h}</div>
          <div className="text-xs text-muted-foreground">Messages (24h)</div>
        </div>
        <div className="text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-600" />
          <div className="text-xl font-bold">{activity?.logins24h}</div>
          <div className="text-xs text-muted-foreground">Logins (24h)</div>
        </div>
      </div>
    </Card>
  );
};

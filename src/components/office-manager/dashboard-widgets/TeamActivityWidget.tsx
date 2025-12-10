import { Card } from '@/components/ui/card';
import { Users, MessageSquare, CheckSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { ActivitySkeleton } from '@/components/ui/workspace-skeleton';

export const TeamActivityWidget = () => {
  const { activeOffice } = useOfficeSwitcher();

  const { data: activity, isLoading } = useQuery({
    queryKey: ['team-activity-widget', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;

      const [teams, messages, tasks] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }).eq('agency_id', activeOffice.id).eq('is_personal_team', false).eq('is_archived', false),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('completed', false),
      ]);

      return {
        teams: teams.count || 0,
        messages24h: messages.count || 0,
        openTasks: tasks.count || 0,
      };
    },
    enabled: !!activeOffice?.id,
  });

  if (isLoading) {
    return <ActivitySkeleton workspace="office-manager" />;
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Team Activity</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
          <div className="text-xl font-bold">{activity?.teams || 0}</div>
          <div className="text-xs text-muted-foreground">Teams</div>
        </div>
        <div className="text-center">
          <MessageSquare className="h-5 w-5 mx-auto mb-1 text-green-600" />
          <div className="text-xl font-bold">{activity?.messages24h || 0}</div>
          <div className="text-xs text-muted-foreground">Messages (24h)</div>
        </div>
        <div className="text-center">
          <CheckSquare className="h-5 w-5 mx-auto mb-1 text-purple-600" />
          <div className="text-xl font-bold">{activity?.openTasks || 0}</div>
          <div className="text-xs text-muted-foreground">Open Tasks</div>
        </div>
      </div>
    </Card>
  );
};

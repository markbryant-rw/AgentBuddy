import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TaskActivityProps {
  taskId: string;
}

export function TaskActivity({ taskId }: TaskActivityProps) {
  const { data: activities = [] } = useQuery<any[]>({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      // @ts-ignore - New table not yet in generated types
      const { data, error } = await (supabase as any)
        .from('task_activity_log')
        .select('id, task_id, user_id, action, details, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user details separately
      const activities = data || [];
      const userIds = [...new Set(
        activities
          .map((a: any) => a.user_id)
          .filter((id): id is string => typeof id === 'string' && id !== null)
      )];
      
      if (userIds.length === 0) return activities;
      
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds as string[]);
      
      return activities.map((activity: any) => ({
        ...activity,
        user: users?.find((u: any) => u.id === activity.user_id),
      }));
    },
  });

  const getActivityMessage = (activity: any) => {
    const userName = activity.user?.full_name || 'Someone';
    
    switch (activity.action) {
      case 'created':
        return `${userName} created this task`;
      case 'completed':
        return `${userName} completed this task`;
      case 'uncompleted':
        return `${userName} reopened this task`;
      case 'status_changed':
        return `${userName} changed status from ${activity.details?.from} to ${activity.details?.to}`;
      default:
        return `${userName} updated this task`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5" />
        <h3 className="font-semibold">Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.map((activity: any) => (
          <div key={activity.id} className="flex gap-3 text-sm">
            <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <p>{getActivityMessage(activity)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        )}
      </div>
    </div>
  );
}

import { useTaskActivity } from "@/hooks/useTaskActivity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Circle, UserPlus, UserMinus, MessageCircle, Paperclip } from "lucide-react";

interface TaskActivityLogProps {
  taskId: string;
}

export const TaskActivityLog = ({ taskId }: TaskActivityLogProps) => {
  const { activities, isLoading } = useTaskActivity(taskId);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Circle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reopened':
        return <Circle className="h-4 w-4 text-yellow-500" />;
      case 'assigned':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'unassigned':
        return <UserMinus className="h-4 w-4 text-gray-500" />;
      case 'commented':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'attachment_added':
        return <Paperclip className="h-4 w-4 text-indigo-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getActivityText = (activity: any) => {
    const metadata = activity.metadata || {};
    switch (activity.activity_type) {
      case 'created':
        return `created task "${metadata.title}"`;
      case 'completed':
        return 'marked task as complete';
      case 'reopened':
        return 'reopened the task';
      case 'status_changed':
        return `changed status from ${metadata.old_status?.replace('_', ' ')} to ${metadata.new_status?.replace('_', ' ')}`;
      case 'assigned':
        return `assigned this task`;
      case 'unassigned':
        return `removed assignment`;
      case 'commented':
        return 'added a comment';
      case 'attachment_added':
        return 'added an attachment';
      default:
        return activity.activity_type;
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-4">Loading activity...</p>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>;
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center">
                  {getActivityIcon(activity.activity_type)}
                </div>
              </div>

              {/* Activity content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={activity.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {activity.user?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">
                    {activity.user?.full_name || 'Unknown'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getActivityText(activity)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

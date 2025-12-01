import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const TaskNotificationBell = () => {
  const { notifications, unreadCount, markAsRead, dismissNotification, markAllAsRead } =
    useTaskNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark all as read when opening
      markAllAsRead();
    }
  };

  const newNotifications = notifications.filter(
    (n) => !n.read && new Date(n.created_at) > new Date(Date.now() - 3600000) // Last hour
  );
  const earlierNotifications = notifications.filter(
    (n) => n.read || new Date(n.created_at) <= new Date(Date.now() - 3600000)
  );

  if (notifications.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <h3 className="font-semibold">Task Assignments</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-teal-500/10 text-teal-700 dark:text-teal-400">
              {unreadCount} new
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-[500px]">
          {/* New Notifications */}
          {newNotifications.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">NEW</div>
              <div className="space-y-1">
                {newNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-lg hover:bg-accent transition-colors",
                      !notification.read && "bg-teal-500/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={notification.assigner?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {notification.assigner?.full_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {notification.assigner?.full_name || "Someone"}
                          </span>{" "}
                          assigned you:
                        </p>
                        <p className="text-sm font-semibold mt-0.5 line-clamp-1">
                          {notification.task?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {notification.task?.due_date && (
                            <span>Due: {format(new Date(notification.task.due_date), "MMM d")}</span>
                          )}
                          {notification.board && (
                            <>
                              <span>•</span>
                              <span>{notification.board.title}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                            <Link
                              to="/tasks/my-assignments"
                              onClick={() => setIsOpen(false)}
                            >
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotification(notification.id)}
                            className="h-7 text-xs"
                          >
                            Dismiss
                          </Button>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Earlier Notifications */}
          {earlierNotifications.length > 0 && (
            <div className="p-2 border-t">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">EARLIER</div>
              <div className="space-y-1">
                {earlierNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg hover:bg-accent transition-colors opacity-75"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={notification.assigner?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {notification.assigner?.full_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">
                            {notification.assigner?.full_name || "Someone"}
                          </span>{" "}
                          assigned you:
                        </p>
                        <p className="text-sm font-semibold mt-0.5 line-clamp-1">
                          {notification.task?.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {notification.task?.due_date && (
                            <span>Due: {format(new Date(notification.task.due_date), "MMM d")}</span>
                          )}
                          {notification.board && (
                            <>
                              <span>•</span>
                              <span>{notification.board.title}</span>
                            </>
                          )}
                          <span className="ml-auto">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t bg-muted/50">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link to="/tasks/my-assignments" onClick={() => setIsOpen(false)}>
              View All Assignments →
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

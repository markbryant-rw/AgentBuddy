import { memo } from 'react';
import { usePomodoroContext } from '@/contexts/PomodoroContext';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Phase 3: Memoize component to prevent unnecessary re-renders
// Date is now provided by PomodoroProvider context
export const PomodoroStats = memo(() => {
  const { sessions, completedCount, isLoading } = usePomodoroContext();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const completedSessions = sessions.filter((s) => s.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍅</span>
        <div>
          <p className="text-sm font-medium">
            {completedCount} Pomodoro{completedCount !== 1 ? 's' : ''} Completed
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {completedSessions.length > 0 && (
        <ScrollArea className="h-[200px] w-full rounded-md border">
          <div className="p-3 space-y-2">
            {completedSessions.map((session) => (
              <Card key={session.id} className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {session.session_title || session.session_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.started_at), 'h:mm a')} • {session.duration_minutes} min
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {session.duration_minutes}m
                  </Badge>
                </div>
                {session.notes && (
                  <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {session.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {completedSessions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No completed sessions yet today
        </p>
      )}
    </div>
  );
});

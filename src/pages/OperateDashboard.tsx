import { ListChecks } from 'lucide-react';
import { useHubData } from '@/hooks/useHubData';
import { useProjects } from '@/hooks/useProjects';
import OperateNavigationCards from '@/components/operate/OperateNavigationCards';
import { useNotes } from '@/hooks/useNotes';
import { subDays } from 'date-fns';

const OperateDashboard = () => {
  const hubData = useHubData();
  const { projects } = useProjects();

  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed');
  const overdueProjects = activeProjects.filter(p => {
    if (!p.due_date) return false;
    return new Date(p.due_date) < new Date();
  });

  const { notes } = useNotes();
  
  const notesStats = {
    totalNotes: notes.filter(n => !n.archived_at).length,
    recentNotes: notes.filter(n => {
      const updated = new Date(n.updated_at);
      return updated >= subDays(new Date(), 7);
    }).length,
    pinnedNotes: notes.filter(n => n.is_pinned && !n.archived_at).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ListChecks className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Operate Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage daily tasks, coordinate projects, and stay connected with your team
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Today's Tasks</div>
          <div className="text-2xl font-bold mt-1">
            {hubData.tasks.myTasksToday.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Projects</div>
          <div className="text-2xl font-bold mt-1">{activeProjects.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Unread Messages</div>
          <div className="text-2xl font-bold mt-1">{hubData.messages.unreadCount}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Pending Tasks</div>
          <div className="text-2xl font-bold mt-1">{hubData.tasks.pending.length}</div>
        </div>
      </div>

      {/* Navigation Cards */}
      <OperateNavigationCards
        todaysTasks={hubData.tasks.myTasksToday.length}
        completedToday={hubData.tasks.myTasksToday.filter(t => t.completed).length}
        activeProjects={activeProjects.length}
        overdueProjects={overdueProjects.length}
        unreadMessages={hubData.messages.unreadCount}
        recentConversations={hubData.messages.recentConversations.length}
        totalNotes={notesStats.totalNotes}
        recentNotes={notesStats.recentNotes}
        pinnedNotes={notesStats.pinnedNotes}
      />
    </div>
  );
};

export default OperateDashboard;

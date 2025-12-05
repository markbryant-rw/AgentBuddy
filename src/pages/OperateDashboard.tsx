import { ListChecks, Calendar, FolderKanban, MessageSquare, ClipboardList } from 'lucide-react';
import { useHubData } from '@/hooks/useHubData';
import { useProjects } from '@/hooks/useProjects';
import OperateNavigationCards from '@/components/operate/OperateNavigationCards';
import { useNotes } from '@/hooks/useNotes';
import { MyAssignmentsCard } from '@/components/projects/MyAssignmentsCard';
import { subDays } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';

const OperateDashboard = () => {
  const hubData = useHubData();
  const { projects } = useProjects();

  const activeProjects = projects.filter((p) => p.status !== 'archived' && p.status !== 'completed');
  const overdueProjects: any[] = [];

  const { notes } = useNotes();

  const notesStats = {
    totalNotes: notes.length,
    recentNotes: notes.filter((n) => {
      const updated = new Date(n.updated_at || '');
      return updated >= subDays(new Date(), 7);
    }).length,
    pinnedNotes: 0,
  };

  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div>
        <div className="flex items-center gap-fluid-md">
          <ListChecks className="h-icon-lg w-icon-lg text-primary" />
          <h1 className="text-fluid-3xl font-bold">Operate Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Manage daily tasks, coordinate projects, and stay connected with your team
        </p>
      </div>

      {/* Quick Stats Row - Using StatCard component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-md">
        <StatCard
          workspace="operate"
          icon={Calendar}
          label="Today's Tasks"
          value={hubData.tasks.myTasksToday.length}
        />
        <StatCard
          workspace="operate"
          icon={FolderKanban}
          label="Active Projects"
          value={activeProjects.length}
        />
        <StatCard
          workspace="operate"
          icon={MessageSquare}
          label="Unread Messages"
          value={hubData.messages.unreadCount}
        />
        <StatCard
          workspace="operate"
          icon={ClipboardList}
          label="Pending Tasks"
          value={hubData.tasks.pending.length}
        />
      </div>

      {/* Navigation Cards */}
      <OperateNavigationCards
        todaysTasks={hubData.tasks.myTasksToday.length}
        completedToday={hubData.tasks.myTasksToday.filter((t) => t.completed).length}
        activeProjects={activeProjects.length}
        overdueProjects={overdueProjects.length}
        unreadMessages={hubData.messages.unreadCount}
        recentConversations={hubData.messages.recentConversations.length}
        totalNotes={notesStats.totalNotes}
        recentNotes={notesStats.recentNotes}
        pinnedNotes={notesStats.pinnedNotes}
      />

      {/* My Assignments - Quick view of tasks assigned to you */}
      <MyAssignmentsCard />
    </div>
  );
};

export default OperateDashboard;

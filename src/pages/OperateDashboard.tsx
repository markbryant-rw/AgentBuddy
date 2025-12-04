import { ListChecks } from 'lucide-react';
import { useHubData } from '@/hooks/useHubData';
import { useProjects } from '@/hooks/useProjects';
import OperateNavigationCards from '@/components/operate/OperateNavigationCards';
import { useNotes } from '@/hooks/useNotes';
import { MyAssignmentsCard } from '@/components/projects/MyAssignmentsCard';
import { subDays } from 'date-fns';

const OperateDashboard = () => {
  const hubData = useHubData();
  const { projects } = useProjects();

  const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed');
  const overdueProjects: any[] = []; // Stubbed - due_date not on Project type

  const { notes } = useNotes();
  
  const notesStats = {
    totalNotes: notes.length,
    recentNotes: notes.filter(n => {
      const updated = new Date(n.updated_at || '');
      return updated >= subDays(new Date(), 7);
    }).length,
    pinnedNotes: 0, // Stubbed - is_pinned not on Note type
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

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-fluid-md">
        <div className="bg-card border rounded-lg p-fluid-md">
          <div className="text-fluid-sm text-muted-foreground">Today's Tasks</div>
          <div className="text-fluid-2xl font-bold mt-1">
            {hubData.tasks.myTasksToday.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-fluid-md">
          <div className="text-fluid-sm text-muted-foreground">Active Projects</div>
          <div className="text-fluid-2xl font-bold mt-1">{activeProjects.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-fluid-md">
          <div className="text-fluid-sm text-muted-foreground">Unread Messages</div>
          <div className="text-fluid-2xl font-bold mt-1">{hubData.messages.unreadCount}</div>
        </div>
        <div className="bg-card border rounded-lg p-fluid-md">
          <div className="text-fluid-sm text-muted-foreground">Pending Tasks</div>
          <div className="text-fluid-2xl font-bold mt-1">{hubData.tasks.pending.length}</div>
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

      {/* My Assignments - Quick view of tasks assigned to you */}
      <MyAssignmentsCard />
    </div>
  );
};

export default OperateDashboard;

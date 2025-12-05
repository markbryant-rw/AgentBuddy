import { Calendar, FolderKanban, MessageSquare, FileText } from 'lucide-react';
import { WorkspaceCard } from '@/components/ui/workspace-card';

interface OperateNavigationCardsProps {
  todaysTasks: number;
  completedToday: number;
  activeProjects: number;
  overdueProjects: number;
  unreadMessages: number;
  recentConversations: number;
  totalNotes: number;
  recentNotes: number;
  pinnedNotes: number;
}

const OperateNavigationCards = ({
  todaysTasks,
  completedToday,
  activeProjects,
  overdueProjects,
  unreadMessages,
  recentConversations,
  totalNotes,
  recentNotes,
  pinnedNotes,
}: OperateNavigationCardsProps) => {
  const cards = [
    {
      title: 'Daily Planner',
      description: 'Organize and manage your daily tasks',
      icon: Calendar,
      route: '/daily-planner',
      stats: [
        { label: "Today's Tasks", value: todaysTasks },
        { label: 'Completed', value: completedToday },
        {
          label: 'Completion Rate',
          value: todaysTasks > 0 ? `${Math.round((completedToday / todaysTasks) * 100)}%` : '0%',
        },
      ],
    },
    {
      title: 'Projects',
      description: 'Track and coordinate team projects',
      icon: FolderKanban,
      route: '/projects',
      stats: [
        { label: 'Active Projects', value: activeProjects },
        { label: 'Overdue', value: overdueProjects, alert: overdueProjects > 0 },
        { label: 'Status', value: overdueProjects > 0 ? 'Needs Attention' : 'On Track' },
      ],
    },
    {
      title: 'Messages',
      description: 'Stay connected with your team',
      icon: MessageSquare,
      route: '/messages',
      stats: [
        { label: 'Unread Messages', value: unreadMessages, alert: unreadMessages > 0 },
        { label: 'Active Conversations', value: recentConversations },
        { label: 'Status', value: unreadMessages > 0 ? 'New Messages' : 'All Caught Up' },
      ],
    },
    {
      title: 'Notes',
      description: 'Capture ideas and meeting notes',
      icon: FileText,
      route: '/notes',
      stats: [
        { label: 'Total Notes', value: totalNotes },
        { label: 'Recent', value: recentNotes },
        { label: 'Pinned', value: pinnedNotes },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-lg">
      {cards.map((card) => (
        <WorkspaceCard
          key={card.route}
          workspace="operate"
          title={card.title}
          description={card.description}
          icon={card.icon}
          route={card.route}
          stats={card.stats}
        />
      ))}
    </div>
  );
};

export default OperateNavigationCards;

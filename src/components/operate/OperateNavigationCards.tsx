import { useNavigate } from 'react-router-dom';
import { Calendar, FolderKanban, MessageSquare, FileText, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';

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
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const [clickedCard, setClickedCard] = useState<string | null>(null);

  const handleCardClick = (route: string) => {
    setClickedCard(route);
    startTransition(() => {
      navigate(route);
    });
  };

  const cards = [
    // ... keep existing code (Daily Planner, Projects, Messages cards)
    {
      title: 'Daily Planner',
      description: 'Organize and manage your daily tasks',
      icon: Calendar,
      route: '/daily-planner',
      gradient: 'from-purple-500/10 to-purple-600/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      stats: [
        { label: 'Today\'s Tasks', value: todaysTasks },
        { label: 'Completed', value: completedToday },
        { label: 'Completion Rate', value: todaysTasks > 0 ? `${Math.round((completedToday / todaysTasks) * 100)}%` : '0%' },
      ],
    },
    {
      title: 'Projects',
      description: 'Track and coordinate team projects',
      icon: FolderKanban,
      route: '/projects',
      gradient: 'from-blue-500/10 to-blue-600/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
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
      gradient: 'from-green-500/10 to-green-600/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
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
      gradient: 'from-indigo-500/10 to-indigo-600/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      stats: [
        { label: 'Total Notes', value: totalNotes },
        { label: 'Recent', value: recentNotes },
        { label: 'Pinned', value: pinnedNotes },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.route}
            className={cn(
              'group relative overflow-hidden cursor-pointer',
              'hover:shadow-xl transition-all duration-200',
              'border-l-4 border-l-purple-500',
              clickedCard === card.route && 'opacity-70 scale-[0.98]'
            )}
            onClick={() => handleCardClick(card.route)}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
            
            <div className="relative p-6 space-y-4">
              {/* Icon & Title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-3 rounded-lg', card.iconBg)}>
                    <Icon className={cn('h-6 w-6', card.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                {card.stats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className={cn(
                      'text-lg font-bold',
                      stat.alert && 'text-orange-600 dark:text-orange-400'
                    )}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* View Indicator */}
              <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                <span>Click to view</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default OperateNavigationCards;

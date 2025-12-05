import { MessageSquare, BookOpen, Mic2, MessageSquarePlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WorkspaceCard } from '@/components/ui/workspace-card';

export function GrowNavigationCards() {
  const { user } = useAuth();

  // Fetch feedback stats
  const { data: feedbackStats } = useQuery({
    queryKey: ['feedback-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { bugReports: 0, featureRequests: 0, points: 0 };

      const [bugCount, featureCount, profile] = await Promise.all([
        (supabase as any).from('bug_reports').select('id').eq('user_id', user.id),
        (supabase as any).from('feature_requests').select('id').eq('user_id', user.id),
        (supabase as any).from('profiles').select('total_bug_points').eq('id', user.id).single(),
      ]);

      return {
        bugReports: bugCount.data?.length || 0,
        featureRequests: featureCount.data?.length || 0,
        points: profile.data?.total_bug_points || 0,
      };
    },
    enabled: !!user?.id,
  });

  const cards = [
    {
      title: 'AI Coaching Board',
      description: 'Get personalized coaching and strategic guidance',
      icon: MessageSquare,
      route: '/coaches-corner',
      comingSoon: true,
      stats: [
        { label: 'Total Conversations', value: '—' },
        { label: 'Starred', value: '—' },
        { label: 'Active Sessions', value: '—' },
      ],
    },
    {
      title: 'Knowledge Library',
      description: 'Access playbooks, guides, and learning resources',
      icon: BookOpen,
      route: '/knowledge-base',
      comingSoon: true,
      stats: [
        { label: 'Categories', value: '—' },
        { label: 'Playbooks', value: '—' },
        { label: 'Completed', value: '—' },
      ],
    },
    {
      title: 'AI Roleplaying',
      description: 'Practice sales conversations with AI prospects',
      icon: Mic2,
      route: '/role-playing',
      comingSoon: true,
      stats: [
        { label: 'Scenarios', value: '—' },
        { label: 'Completed', value: '—' },
        { label: 'Avg Rating', value: '—' },
      ],
    },
    {
      title: 'Feedback Centre',
      description: 'Report bugs, suggest features, and help us improve',
      icon: MessageSquarePlus,
      route: '/feedback-centre',
      comingSoon: false,
      stats: [
        { label: 'Your Bug Reports', value: feedbackStats?.bugReports || 0 },
        { label: 'Feature Requests', value: feedbackStats?.featureRequests || 0 },
        { label: 'Bug Hunter Points', value: feedbackStats?.points || 0 },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-lg">
      {cards.map((card) => (
        <WorkspaceCard
          key={card.route}
          workspace="grow"
          title={card.title}
          description={card.description}
          icon={card.icon}
          route={card.route}
          stats={card.stats}
          comingSoon={card.comingSoon}
        />
      ))}
    </div>
  );
}

import { FriendLeaderboard } from '@/components/FriendLeaderboard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function Leaderboards() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Placeholder leaderboard - in production this would fetch real data
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['weekly-leaderboard'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch profiles with basic data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(50);
      
      if (error) throw error;
      
      // Return formatted leaderboard data with placeholder values
      return (data || []).map((entry, index) => ({
        rank: index + 1,
        user_id: entry.id,
        display_name: entry.full_name || 'Unknown',
        avatar_url: entry.avatar_url,
        week_cch: Math.random() * 30, // Placeholder - would calculate from kpi_entries
        current_streak: Math.floor(Math.random() * 10),
        is_friend: false,
      })).sort((a, b) => b.week_cch - a.week_cch);
    },
    enabled: !!user?.id,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/engage-dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-amber-600" />
            Leaderboards
          </h1>
          <p className="text-muted-foreground">
            See how you stack up against your team
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <FriendLeaderboard 
          leaderboard={leaderboard} 
          currentUserId={user?.id || ''} 
        />
      )}
    </div>
  );
}

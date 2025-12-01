import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriendStats } from '@/hooks/useFriendStats';
import { usePresence } from '@/hooks/usePresence';
import { PresenceDot } from './PresenceDot';
import { Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

export default function GlobalTab() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { leaderboard, loading } = useFriendStats();
  const { allPresence } = usePresence();
  const [view, setView] = useState<'week' | 'allTime' | 'streaks'>('week');

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (view === 'week') return b.week_cch - a.week_cch;
      if (view === 'allTime') return (b.week_cch || 0) - (a.week_cch || 0); // TODO: Add all-time CCH
      return b.current_streak - a.current_streak;
    });
  }, [leaderboard, view]);

  const myRank = sortedLeaderboard.findIndex(l => l.user_id === user?.id) + 1;
  const myEntry = sortedLeaderboard.find(l => l.user_id === user?.id);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Global Leaderboard
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              This Week
            </Button>
            <Button
              variant={view === 'allTime' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('allTime')}
            >
              All-Time
            </Button>
            <Button
              variant={view === 'streaks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('streaks')}
            >
              Streaks
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* User's row - pinned at top */}
          {myEntry && (
            <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary flex items-center gap-4">
              <div className="font-bold text-lg min-w-[2rem]">
                #{myRank}
              </div>
              <Avatar className="h-10 w-10 relative">
                <AvatarImage src={myEntry.avatar_url || ''} />
                <AvatarFallback>{myEntry.full_name?.[0]}</AvatarFallback>
                <div className="absolute -bottom-1 -right-1">
                  <PresenceDot 
                    status={allPresence[myEntry.user_id] as any || 'offline'} 
                    lastActive={myEntry.full_name}
                    size="sm"
                  />
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {myEntry.full_name} <Badge variant="secondary" className="ml-2">YOU</Badge>
                </div>
                {!isMobile && (
                  <div className="text-xs text-muted-foreground truncate">
                    {myEntry.email}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {view === 'streaks' ? `${myEntry.current_streak} days` : `${myEntry.week_cch.toFixed(1)} CCH`}
                </div>
                {view !== 'streaks' && myEntry.current_streak > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {myEntry.current_streak}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top 50 leaderboard */}
          {sortedLeaderboard.filter(l => l.user_id !== user?.id).slice(0, 50).map((entry, index) => {
            const actualRank = sortedLeaderboard.findIndex(l => l.user_id === entry.user_id) + 1;
            const getRankIcon = (rank: number) => {
              if (rank === 1) return '🥇';
              if (rank === 2) return '🥈';
              if (rank === 3) return '🥉';
              return `#${rank}`;
            };

            return (
              <div key={entry.user_id} className="p-3 md:p-4 rounded-lg border flex items-center gap-3 md:gap-4 hover:bg-accent/50 transition-colors">
                <div className="font-semibold text-sm md:text-base min-w-[2rem]">
                  {getRankIcon(actualRank)}
                </div>
                <Avatar className="h-8 w-8 md:h-10 md:w-10 relative">
                  <AvatarImage src={entry.avatar_url || ''} />
                  <AvatarFallback>{entry.display_name?.[0]}</AvatarFallback>
                  <div className="absolute -bottom-1 -right-1">
                    <PresenceDot 
                      status={allPresence[entry.user_id] as any || 'offline'}
                      size="sm"
                    />
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm md:text-base">
                    {entry.display_name}
                    {!entry.is_friend && (
                      <Badge variant="outline" className="ml-2 text-xs">Not a friend</Badge>
                    )}
                  </div>
                  {!isMobile && entry.is_friend && (
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.email}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm md:text-base">
                    {view === 'streaks' ? `${entry.current_streak} days` : `${entry.week_cch.toFixed(1)} CCH`}
                  </div>
                  {view !== 'streaks' && entry.current_streak > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {entry.current_streak}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

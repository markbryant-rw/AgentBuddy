import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  week_cch: number;
  current_streak: number;
  is_friend: boolean;
}

interface FriendLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

export const FriendLeaderboard = ({ leaderboard, currentUserId }: FriendLeaderboardProps) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
    }
  };

  const getCardStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-primary/10 border-primary/50 border-2';
    }
    if (rank <= 3) {
      return 'bg-accent/50 border-accent';
    }
    return 'bg-card';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Weekly Leaderboard</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          Top 50 • Cross-Team
        </Badge>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId;
          
          return (
            <Card
              key={entry.user_id}
              className={cn(
                'p-4 transition-all hover:shadow-md',
                getCardStyle(entry.rank, isCurrentUser)
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>

                <Avatar className={cn(
                  'h-10 w-10',
                  isCurrentUser && 'ring-2 ring-primary'
                )}>
                  <AvatarImage src={entry.is_friend ? entry.avatar_url || undefined : undefined} />
                  <AvatarFallback>{entry.display_name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'font-semibold truncate',
                      isCurrentUser && 'text-primary'
                    )}>
                      {isCurrentUser ? 'YOU' : entry.display_name}
                    </p>
                    {!entry.is_friend && !isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        Not a friend
                      </Badge>
                    )}
                  </div>
                  {entry.current_streak > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Flame className="h-3 w-3" />
                      <span>{entry.current_streak} day streak</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {entry.week_cch.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">CCH</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No leaderboard data yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start logging your KPIs to compete!
          </p>
        </div>
      )}
    </Card>
  );
};

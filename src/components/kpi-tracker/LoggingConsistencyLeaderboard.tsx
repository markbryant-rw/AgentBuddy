import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTeamLoggingConsistency } from '@/hooks/useTeamLoggingConsistency';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Trophy, Flame, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface LoggingConsistencyLeaderboardProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  currentUserStreak?: number;
  longestUserStreak?: number;
}

export const LoggingConsistencyLeaderboard = ({ 
  isCollapsed = false, 
  onToggle,
  currentUserStreak = 0,
  longestUserStreak = 0
}: LoggingConsistencyLeaderboardProps) => {
  const { data: entries = [], isLoading } = useTeamLoggingConsistency();
  const { user } = useAuth();
  const navigate = useNavigate();

  const topEntries = entries.slice(0, 10);
  const currentUserEntry = entries.find(e => e.userId === user?.id);
  const showCurrentUser = currentUserEntry && currentUserEntry.rank > 10;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getConsistencyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-amber-500';
    return '';
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const monthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Team Logging Consistency - {monthName}
              </CardTitle>
              {currentUserStreak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">Your Streak: {currentUserStreak} days</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Who's building the best habits this month?
            </p>
          </div>
          {onToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
            </div>
          ) : topEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Be the first to log consistently this month!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topEntries.map((entry) => (
                <div
                  key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    entry.userId === user?.id 
                      ? "bg-primary/5 border-primary/20" 
                      : "hover:bg-muted/50",
                    entry.consistencyPercentage >= 90 && "border-green-500/20"
                  )}
                >
                  <div className="flex items-center justify-center w-10 text-lg font-bold">
                    {getRankBadge(entry.rank)}
                  </div>
                  
                  <Avatar 
                    className="h-10 w-10 cursor-pointer"
                    onClick={() => navigate(`/profile/${entry.userId}`)}
                  >
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(entry.fullName)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span 
                          className="font-medium truncate cursor-pointer hover:underline"
                          onClick={() => navigate(`/profile/${entry.userId}`)}
                        >
                          {entry.fullName}
                          {entry.userId === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          • {entry.daysLogged} of {entry.totalBusinessDays} days
                        </span>
                      </div>
                      <span className={cn("text-sm font-bold ml-2 whitespace-nowrap", getConsistencyColor(entry.consistencyPercentage))}>
                        {entry.consistencyPercentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={entry.consistencyPercentage} 
                        className="h-2 flex-1 max-w-[70%]"
                        indicatorClassName={getProgressColor(entry.consistencyPercentage)}
                      />
                      {entry.currentStreak > 0 && (
                        <div className="flex items-center gap-1 text-orange-500 whitespace-nowrap">
                          <Flame className="h-4 w-4" />
                          <span className="text-base font-medium">{entry.currentStreak}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {showCurrentUser && currentUserEntry && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs text-muted-foreground mb-2 text-center">
                      Your Rank
                    </div>
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20"
                    )}>
                      <div className="flex items-center justify-center w-10 text-lg font-bold">
                        {getRankBadge(currentUserEntry.rank)}
                      </div>
                      
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUserEntry.avatarUrl || undefined} />
                        <AvatarFallback>{getInitials(currentUserEntry.fullName)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {currentUserEntry.fullName}
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              • {currentUserEntry.daysLogged} of {currentUserEntry.totalBusinessDays} days
                            </span>
                          </div>
                          <span className={cn("text-sm font-bold ml-2 whitespace-nowrap", getConsistencyColor(currentUserEntry.consistencyPercentage))}>
                            {currentUserEntry.consistencyPercentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={currentUserEntry.consistencyPercentage} 
                            className="h-2 flex-1 max-w-[70%]"
                            indicatorClassName={getProgressColor(currentUserEntry.consistencyPercentage)}
                          />
                          {currentUserEntry.currentStreak > 0 && (
                            <div className="flex items-center gap-1 text-orange-500 whitespace-nowrap">
                              <Flame className="h-4 w-4" />
                              <span className="text-base font-medium">{currentUserEntry.currentStreak}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

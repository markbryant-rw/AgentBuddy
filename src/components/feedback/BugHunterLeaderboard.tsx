import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Bug, CheckCircle, Medal } from 'lucide-react';
import { useBugPoints, ACHIEVEMENTS } from '@/hooks/useBugPoints';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const BugHunterLeaderboard = () => {
  const { leaderboard, isLoadingLeaderboard } = useBugPoints();

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
    if (index === 1) return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    if (index === 2) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
    return 'bg-muted';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingLeaderboard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Bug Hunter Leaderboard
          </CardTitle>
          <CardDescription>Top bug reporters this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Bug Hunter Leaderboard
          </CardTitle>
          <CardDescription>Top bug reporters this month</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No bug reports yet. Be the first! 🐛
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Bug Hunter Leaderboard
        </CardTitle>
        <CardDescription>Top bug reporters - Help us improve!</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-md',
                  index < 3 ? getRankBadgeColor(index) : 'bg-muted/50 hover:bg-muted'
                )}
              >
                <div className="flex-shrink-0 w-8 flex items-center justify-center">
                  {getRankIcon(index)}
                </div>

                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(entry.full_name || 'User')}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-semibold truncate',
                    index < 3 && 'text-white'
                  )}>
                    {entry.full_name || 'Anonymous'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(
                            'text-xs flex items-center gap-1',
                            index < 3 ? 'text-white/80' : 'text-muted-foreground'
                          )}>
                            <Bug className="h-3 w-3" />
                            {entry.bugs_reported}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Bugs Reported</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn(
                            'text-xs flex items-center gap-1',
                            index < 3 ? 'text-white/80' : 'text-muted-foreground'
                          )}>
                            <CheckCircle className="h-3 w-3" />
                            {entry.bugs_fixed}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Bugs Fixed</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <Badge
                  variant={index < 3 ? 'secondary' : 'outline'}
                  className={cn(
                    'font-bold text-sm',
                    index < 3 && 'bg-white/20 text-white border-white/30'
                  )}
                >
                  {entry.total_bug_points} pts
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Achievement Legend */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Achievements</p>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.slice(0, 4).map((achievement) => (
              <TooltipProvider key={achievement.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50 hover:bg-muted transition-colors">
                      <span className="text-lg">{achievement.icon}</span>
                      <span className="font-medium truncate">{achievement.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    <p className="text-xs font-bold text-primary mt-1">+{achievement.points} points</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

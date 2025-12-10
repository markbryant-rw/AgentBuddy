import { motion } from 'framer-motion';
import { useTeamAppraisalLeaderboard } from '@/hooks/useTeamAppraisalLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { startOfQuarter, endOfQuarter } from 'date-fns';

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <span className="text-2xl">🥇</span>;
    case 2:
      return <span className="text-2xl">🥈</span>;
    case 3:
      return <span className="text-2xl">🥉</span>;
    default:
      return <span className="text-sm font-bold text-muted-foreground w-6 text-center">#{rank}</span>;
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const TeamAppraisalLeaderboard = () => {
  const { user } = useAuth();
  const { entries, maxCount, isLoading, shouldShow } = useTeamAppraisalLeaderboard();

  // Get current quarter info
  const now = new Date();
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold">Team Leaderboard</h3>
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  // Don't render if shouldShow is false (solo or no qualifying members)
  if (!shouldShow) {
    return null;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-4">
        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No team data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold">Team Leaderboard</h3>
        </div>
        <Badge variant="secondary" className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
          {currentQuarter} Appraisals
        </Badge>
      </div>

      {/* Leaderboard Entries */}
      <div className="space-y-2">
        {entries.slice(0, 5).map((entry, index) => {
          const isCurrentUser = entry.userId === user?.id;
          const barWidth = maxCount > 0 ? (entry.appraisalCount / maxCount) * 100 : 0;

          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`relative rounded-lg p-2.5 ${
                isCurrentUser
                  ? 'bg-primary/10 ring-2 ring-primary/30'
                  : entry.rank <= 3
                  ? 'bg-amber-50/50 dark:bg-amber-950/20'
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-7 flex justify-center">{getRankIcon(entry.rank)}</div>

                {/* Avatar */}
                <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                  <AvatarImage src={entry.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                    {getInitials(entry.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                      {entry.name}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        YOU
                      </Badge>
                    )}
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.2, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        entry.rank === 1
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                          : entry.rank === 2
                          ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                          : entry.rank === 3
                          ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Count Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                >
                  <Badge
                    variant="secondary"
                    className={`min-w-[36px] justify-center font-bold text-xs ${
                      entry.rank === 1
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : ''
                    }`}
                  >
                    {entry.appraisalCount}
                  </Badge>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Show remaining count if more than 5 */}
      {entries.length > 5 && (
        <p className="text-xs text-center text-muted-foreground">
          +{entries.length - 5} more team members
        </p>
      )}
    </div>
  );
};

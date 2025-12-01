import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamPerformance } from '@/hooks/useTeamPerformance';
import { Trophy, TrendingUp } from 'lucide-react';

interface TeamPerformanceCardProps {
  userId: string;
  teamId?: string;
}

export const TeamPerformanceCard = ({ userId, teamId }: TeamPerformanceCardProps) => {
  const { data: teamPerformance, isLoading } = useTeamPerformance(userId, teamId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!teamPerformance || teamPerformance.length === 0) {
    return null;
  }

  // Sort by weekly CCH
  const sortedTeam = [...teamPerformance].sort((a, b) => b.weekly.cch - a.weekly.cch);
  const topPerformer = sortedTeam[0];

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Team Performance</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>This Week</span>
          </div>
        </div>

        <div className="space-y-3">
          {sortedTeam.map((member, index) => {
            const isTop = index === 0;
            const isCurrentUser = member.userId === userId;
            
            return (
              <div
                key={member.userId}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isCurrentUser
                    ? 'border-primary bg-primary/5'
                    : isTop
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-transparent bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isTop && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                        <Trophy className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {member.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{member.weekly.calls} calls</span>
                      <span>•</span>
                      <span>{member.weekly.appraisals} appraisals</span>
                      <span>•</span>
                      <span>{member.weekly.openHomes} OH</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">{member.weekly.cch.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">CCH hrs</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {topPerformer && topPerformer.userId !== userId && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                {topPerformer.name} is leading with {topPerformer.weekly.cch.toFixed(1)} CCH hrs
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

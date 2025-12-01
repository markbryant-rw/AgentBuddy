import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamGoal, MemberGoal, TeamMember } from '@/hooks/useTeamGoals';

interface TeamGoalsReadOnlyViewProps {
  teamGoals: TeamGoal[];
  memberGoals: MemberGoal[];
  teamMembers: TeamMember[];
  currentUserId: string;
}

const KPI_LABELS = {
  calls: 'Calls (per week)',
  sms: 'SMS (per week)',
  appraisals: 'Appraisals (per week)',
  open_homes: 'Open Homes (per week)',
  listings: 'Listings (per week)',
  sales: 'Sales (per week)',
};

export const TeamGoalsReadOnlyView = ({
  teamGoals,
  memberGoals,
  teamMembers,
  currentUserId,
}: TeamGoalsReadOnlyViewProps) => {
  const kpiTypes = ['calls', 'sms', 'appraisals', 'open_homes', 'listings', 'sales'] as const;

  const getTeamGoalValue = (kpiType: string) => {
    return teamGoals.find(g => g.kpi_type === kpiType)?.target_value || 0;
  };

  const getMemberSum = (kpiType: string) => {
    return memberGoals
      .filter(g => g.kpi_type === kpiType)
      .filter(g => {
        const member = teamMembers.find(m => m.user_id === g.user_id);
        return member?.contributes_to_kpis !== false;
      })
      .reduce((sum, g) => sum + (g.target_value || 0), 0);
  };

  const getUserContribution = (kpiType: string) => {
    const goal = memberGoals.find(g => g.user_id === currentUserId && g.kpi_type === kpiType);
    return goal?.target_value || 0;
  };

  const contributingMembers = teamMembers.filter(m => m.contributes_to_kpis);
  const nonContributingMembers = teamMembers.filter(m => !m.contributes_to_kpis);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Weekly Team Goals Overview</h3>
        <div className="space-y-4">
          {kpiTypes.map(kpi => {
            const teamGoal = getTeamGoalValue(kpi);
            const memberSum = getMemberSum(kpi);
            const userValue = getUserContribution(kpi);
            const progress = teamGoal > 0 ? (memberSum / teamGoal) * 100 : 0;
            const isOnTrack = memberSum >= teamGoal;

            return (
              <Card key={kpi}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{KPI_LABELS[kpi]}</CardTitle>
                    {isOnTrack ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Team Goal:</span>
                    <span className="font-semibold">{teamGoal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member Sum:</span>
                    <span className={cn('font-semibold', isOnTrack ? 'text-green-500' : 'text-orange-500')}>
                      {memberSum}
                    </span>
                  </div>
                  {!isOnTrack && (
                    <div className="flex justify-between text-sm text-orange-500">
                      <span>Variance:</span>
                      <span className="font-semibold">+{teamGoal - memberSum} short</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Your Target:</span>
                    <Badge variant="secondary">{userValue}</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        isOnTrack ? 'bg-green-500' : 'bg-orange-500'
                      )}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Team Members</h3>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Contributing to KPIs ({contributingMembers.length}):
            </p>
            <div className="space-y-1">
              {contributingMembers.map(member => {
                const isCurrentUser = member.user_id === currentUserId;
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md',
                      isCurrentUser ? 'bg-primary/10' : 'bg-muted'
                    )}
                  >
                    <span className="text-sm font-medium">
                      {member.full_name} {isCurrentUser && '(You)'}
                    </span>
                    <div className="flex gap-2 text-xs">
                      {kpiTypes.slice(0, 3).map(kpi => {
                        const goal = memberGoals.find(
                          g => g.user_id === member.user_id && g.kpi_type === kpi
                        );
                        return (
                          <Badge key={kpi} variant="outline" className="text-xs">
                            {goal?.target_value || 0}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {nonContributingMembers.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                Not contributing to KPIs ({nonContributingMembers.length}):
              </p>
              <div className="space-y-1">
                {nonContributingMembers.map(member => (
                  <div key={member.id} className="flex items-center p-2 rounded-md bg-muted opacity-60">
                    <span className="text-sm">{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

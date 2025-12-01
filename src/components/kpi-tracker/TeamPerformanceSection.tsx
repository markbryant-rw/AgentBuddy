import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Phone, MessageSquare, ClipboardList, Home } from 'lucide-react';
import type { TeamKPIData } from '@/hooks/useKPITrackerData';

interface TeamPerformanceSectionProps {
  teamData: TeamKPIData;
}

export const TeamPerformanceSection = ({ teamData }: TeamPerformanceSectionProps) => {
  const { aggregate, cch, members, goals } = teamData;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const kpiConfig = [
    { 
      key: 'calls' as const, 
      label: 'Calls', 
      icon: Phone,
      gradient: 'from-blue-500/10 to-blue-500/5',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    { 
      key: 'sms' as const, 
      label: 'SMS', 
      icon: MessageSquare,
      gradient: 'from-green-500/10 to-green-500/5',
      textColor: 'text-green-600 dark:text-green-400'
    },
    { 
      key: 'appraisals' as const, 
      label: 'Appraisals', 
      icon: ClipboardList,
      gradient: 'from-purple-500/10 to-purple-500/5',
      textColor: 'text-purple-600 dark:text-purple-400'
    },
    { 
      key: 'openHomes' as const, 
      label: 'Open Homes', 
      icon: Home,
      gradient: 'from-orange-500/10 to-orange-500/5',
      textColor: 'text-orange-600 dark:text-orange-400'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Team Performance</h2>
      </div>

      {/* Team Aggregate Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>Team Totals This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Calls</p>
              <p className="text-2xl font-bold">{aggregate.calls.week}</p>
              {goals.calls > 0 && (
                <p className="text-xs text-muted-foreground">Goal: {goals.calls}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">SMS</p>
              <p className="text-2xl font-bold">{aggregate.sms.week}</p>
              {goals.sms > 0 && (
                <p className="text-xs text-muted-foreground">Goal: {goals.sms}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Appraisals</p>
              <p className="text-2xl font-bold">{aggregate.appraisals.week}</p>
              {goals.appraisals > 0 && (
                <p className="text-xs text-muted-foreground">Goal: {goals.appraisals}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Homes</p>
              <p className="text-2xl font-bold">{aggregate.openHomes.week}</p>
              {goals.openHomes > 0 && (
                <p className="text-xs text-muted-foreground">Goal: {goals.openHomes}</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">Team CCH This Week</p>
            <p className="text-3xl font-bold">{cch.weekly.toFixed(1)} hrs</p>
            {cch.weeklyTarget > 0 && (
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((cch.weekly / cch.weeklyTarget) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Member Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {members.map((member) => (
              <div key={member.userId} className="space-y-3">
                {/* Member Header */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.cch.weekly.toFixed(1)} hrs CCH this week
                    </p>
                  </div>
                </div>
                
                {/* KPI Boxes Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-0 md:ml-[52px]">
                  {kpiConfig.map((kpi) => {
                    const Icon = kpi.icon;
                    const value = member.kpis[kpi.key].week;
                    const percentage = member.contributionPercent[kpi.key].toFixed(0);
                    
                    return (
                      <Card 
                        key={kpi.key}
                        className={`bg-gradient-to-br ${kpi.gradient} overflow-hidden border-0`}
                      >
                        <CardContent className="p-3 text-center space-y-1">
                          <Icon className={`h-4 w-4 mx-auto ${kpi.textColor}`} />
                          <div className="text-2xl font-bold">{value}</div>
                          <div className="text-xs text-muted-foreground">
                            {percentage}% of team
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {kpi.label}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

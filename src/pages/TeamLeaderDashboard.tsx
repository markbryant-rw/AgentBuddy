import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Target, TrendingUp, Calendar, UserPlus, Settings2, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import { useNavigate } from 'react-router-dom';
import { HelpRequestCard } from '@/components/help/HelpRequestCard';
import { CreateHelpRequestDialog } from '@/components/help/CreateHelpRequestDialog';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { WeeklyTasksPerformanceCard } from '@/components/team-leader/WeeklyTasksPerformanceCard';

export default function TeamLeaderDashboard() {
  const { user } = useAuth();
  const { team } = useTeam();
  const { members } = useTeamMembers();
  const { helpRequests, escalateHelpRequest, resolveHelpRequest } = useHelpRequests();
  const navigate = useNavigate();

  // Filter help requests for this team leader's team
  const teamHelpRequests = helpRequests?.filter(
    (req) => req.team_id === team?.id && ['open', 'acknowledged'].includes(req.status)
  );

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Leader Dashboard</h1>
            <p className="text-muted-foreground mt-1">Lead your team to success</p>
          </div>
          <div className="flex gap-3">
            <CreateHelpRequestDialog />
            <WorkspaceSwitcher currentWorkspace="management" />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">This quarter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Team average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Events this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/invite')}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Invite Team Member</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add new members to your team
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/team-management')}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Manage Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and edit team settings
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate('/goals')}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">View Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track team and individual KPIs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Tasks Performance */}
        <WeeklyTasksPerformanceCard />

        {/* Help Requests & Team Members */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Help Requests</CardTitle>
              <CardDescription>Support needed from your team</CardDescription>
            </CardHeader>
            <CardContent>
              {teamHelpRequests && teamHelpRequests.length > 0 ? (
                <div className="space-y-3">
                  {teamHelpRequests.slice(0, 3).map((request) => (
                    <HelpRequestCard
                      key={request.id}
                      request={request}
                      onEscalate={escalateHelpRequest}
                      onResolve={resolveHelpRequest}
                      showActions={true}
                    />
                  ))}
                  {teamHelpRequests.length > 3 && (
                    <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/help-requests')}>
                      View All ({teamHelpRequests.length})
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No open help requests</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>{members?.length || 0} active members</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/team-management')}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members?.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{member.access_level}</Badge>
                  </div>
                ))}
                {members && members.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => navigate('/team-management')}
                  >
                    View All Members
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>Recent team updates and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

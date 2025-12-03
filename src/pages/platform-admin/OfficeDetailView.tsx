import { useParams, useNavigate } from 'react-router-dom';
import { usePlatformOfficeDetail } from '@/hooks/usePlatformOfficeDetail';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamCard } from '@/components/platform-admin/TeamCard';
import { UserCard } from '@/components/platform-admin/UserCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Users, ChevronDown, ChevronUp, Users2, UserPlus, Shield, UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { CreateTeamDialog } from '@/components/platform/CreateTeamDialog';
import { AddUserDialogPlatform } from '@/components/platform-admin/AddUserDialogPlatform';
import { PlatformStatsCard } from '@/components/platform/PlatformStatsCard';
import { OrphanDataSection } from '@/components/platform-admin/OrphanDataSection';

export default function OfficeDetailView() {
  const { officeId } = useParams<{ officeId: string }>();
  const navigate = useNavigate();
  const { teams, soloAgents, isLoading } = usePlatformOfficeDetail(officeId);
  const [isSoloExpanded, setIsSoloExpanded] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);

  const { data: office } = useQuery({
    queryKey: ['office', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, logo_url')
        .eq('id', officeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!officeId,
  });

  // Fetch office-specific stats
  const { data: officeStats } = useQuery({
    queryKey: ['office-stats', officeId],
    queryFn: async () => {
      if (!officeId) return null;

      // Total users in this office
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'active');

      // Office managers in this office
      const { data: officeManagerIds } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'office_manager')
        .is('revoked_at', null);

      const managerIds = officeManagerIds?.map(r => r.user_id) || [];
      const { count: officeManagers } = managerIds.length > 0
        ? await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('id', managerIds)
            .eq('office_id', officeId)
        : { count: 0 };

      // Users with primary teams in this office
      const { count: usersInTeams } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'active')
        .not('primary_team_id', 'is', null);

      // Solo agents in this office
      const { count: soloAgents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'active')
        .is('primary_team_id', null);

      return {
        totalUsers: totalUsers || 0,
        officeManagers: officeManagers || 0,
        usersInTeams: usersInTeams || 0,
        soloAgents: soloAgents || 0,
      };
    },
    enabled: !!officeId,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/platform-admin/users')}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Offices
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">{office?.name}</span>
        </div>

        {/* Office Header */}
        <div className="border rounded-lg p-6 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">{office?.name}</h1>
              <p className="text-muted-foreground">Office management and user overview</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setCreateTeamOpen(true)}
                className="gap-2"
              >
                <Users2 className="h-4 w-4" />
                Create Team
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteUserOpen(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </div>
          </div>
        </div>

        {/* Office-Level Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatsCard
            title="Total Users"
            value={officeStats?.totalUsers || 0}
            icon={Users}
            subtitle="Active in office"
          />
          <PlatformStatsCard
            title="Office Managers"
            value={officeStats?.officeManagers || 0}
            icon={Shield}
            subtitle="Admins"
          />
          <PlatformStatsCard
            title="In Teams"
            value={officeStats?.usersInTeams || 0}
            icon={Users2}
            subtitle="Team members"
          />
          <PlatformStatsCard
            title="Solo Agents"
            value={officeStats?.soloAgents || 0}
            icon={UserCircle}
            subtitle="Independent users"
          />
        </div>

        {/* Teams Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Teams</h2>
            <p className="text-muted-foreground">
              Teams with multiple members
            </p>
          </div>

          {teams.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No teams found in this office</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>

        {/* Solo Agents Section */}
        <div className="space-y-4">
          <Card className="border-l-4 border-l-muted">
            <CardContent className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsSoloExpanded(!isSoloExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Solo Agents</h3>
                    <p className="text-sm text-muted-foreground">
                      {soloAgents.length} {soloAgents.length === 1 ? 'agent' : 'agents'}
                    </p>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm">
                  {isSoloExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {isSoloExpanded && (
                <div className="mt-4 pt-4 border-t">
                  {soloAgents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No solo agents found
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {soloAgents.map((agent) => (
                        <UserCard key={agent.id} user={agent} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orphan Data Section */}
        {officeId && (
          <OrphanDataSection 
            officeId={officeId} 
            teams={teams.map(t => ({ id: t.id, name: t.name }))} 
          />
        )}
      </div>

      {/* Dialogs */}
      {officeId && (
        <>
          <CreateTeamDialog 
            open={createTeamOpen} 
            onOpenChange={setCreateTeamOpen}
            defaultOfficeId={officeId}
          />
          <AddUserDialogPlatform
            open={inviteUserOpen}
            onOpenChange={setInviteUserOpen}
            officeId={officeId}
          />
        </>
      )}
    </div>
  );
}

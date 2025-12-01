import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, UserPlus, Building2, UsersRound, UserX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RepairUserDialog } from '@/components/platform/RepairUserDialog';
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { OfficeManagersSection } from './OfficeManagersSection';
import { TeamSection } from './TeamSection';
import { SoloAgentsSection } from './SoloAgentsSection';
import { ManageUserDialog } from './ManageUserDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const UserManagementTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [selectedUserForRepair, setSelectedUserForRepair] = useState<{
    id: string;
    full_name: string | null;
    email: string;
    office_id: string | null;
    primary_team_id: string | null;
  } | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const { users, isLoadingUsers } = useAdminUsers();

  // Clean up Josh Smith duplicates on mount
  useState(() => {
    const cleanupDuplicates = async () => {
      const joshUsers = users.filter(u => u.email === 'joshsmith@mrxx.co.nz');
      if (joshUsers.length > 1) {
        const activeUser = joshUsers.find(u => u.status === 'active');
        const inactiveUser = joshUsers.find(u => u.status === 'inactive');
        
        if (activeUser && inactiveUser) {
          try {
            await supabase.functions.invoke('merge-duplicate-users', {
              body: {
                keepUserId: activeUser.id,
                removeUserId: inactiveUser.id
              }
            });
            toast.success('Cleaned up duplicate Josh Smith user');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          } catch (error) {
            console.error('Failed to cleanup duplicate:', error);
          }
        }
      }
    };
    cleanupDuplicates();
  });

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.office_name?.toLowerCase().includes(query) ||
      user.team_name?.toLowerCase().includes(query)
    );
  });

  // Categorize users
  const officeManagers = filteredUsers.filter(u => u.roles.includes('office_manager'));
  
  // Group users by team (excluding office managers and solo agents)
  const teamsMap = new Map<string, AdminUser[]>();
  const soloAgents: AdminUser[] = [];
  
  filteredUsers.forEach(user => {
    // Skip office managers (they're shown separately)
    if (user.roles.includes('office_manager')) return;
    
    // Check if user has a real team (not personal team)
    if (user.primary_team_id && !(user as any).is_personal_team && user.team_name) {
      const teamKey = user.primary_team_id;
      if (!teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, []);
      }
      teamsMap.get(teamKey)!.push(user);
    } else {
      soloAgents.push(user);
    }
  });

  const teams = Array.from(teamsMap.entries()).map(([teamId, members]) => ({
    teamId,
    teamName: members[0].team_name || 'Unknown Team',
    members: members.sort((a, b) => {
      // Team leaders first
      const aIsLeader = a.roles.includes('team_leader');
      const bIsLeader = b.roles.includes('team_leader');
      if (aIsLeader && !bIsLeader) return -1;
      if (!aIsLeader && bIsLeader) return 1;
      return (a.full_name || '').localeCompare(b.full_name || '');
    })
  }));

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setManageDialogOpen(true);
  };

  const handleRepairClick = (user: AdminUser) => {
    setSelectedUserForRepair({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      office_id: user.office_id || null,
      primary_team_id: user.primary_team_id || null,
    });
    setRepairDialogOpen(true);
  };

  // Statistics
  const stats = {
    total: filteredUsers.length,
    officeManagers: officeManagers.length,
    inTeams: Array.from(teamsMap.values()).flat().length,
    soloAgents: soloAgents.length,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
                <Badge variant="secondary" className="ml-2">
                  {stats.total}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage users, roles, and permissions across all offices
              </CardDescription>
            </div>
            <Button onClick={() => navigate('/platform-admin/users/invite')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, office, or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Total Users
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.officeManagers}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Office Managers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.inTeams}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UsersRound className="h-3 w-3" />
                  In Teams
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.soloAgents}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserX className="h-3 w-3" />
                  Solo Agents
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Office Managers Section */}
              <OfficeManagersSection 
                managers={officeManagers} 
                onViewDetails={handleViewDetails}
              />

              {/* Teams Sections */}
              {teams.map((team) => (
                <TeamSection
                  key={team.teamId}
                  teamId={team.teamId}
                  teamName={team.teamName}
                  members={team.members}
                  onViewDetails={handleViewDetails}
                  onRepair={handleRepairClick}
                  defaultOpen={team.members.length <= 5}
                />
              ))}

              {/* Solo Agents Section */}
              <SoloAgentsSection 
                soloAgents={soloAgents} 
                onViewDetails={handleViewDetails}
                onRepair={handleRepairClick}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RepairUserDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        user={selectedUserForRepair}
      />
      
      {selectedUserId && (
        <ManageUserDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          userId={selectedUserId}
        />
      )}
    </>
  );
};

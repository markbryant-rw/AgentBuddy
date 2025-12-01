import { useState } from 'react';
import { Users, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOfficeTeamsUsers } from '@/hooks/useOfficeTeamsUsers';
import { useTeamMembersExpanded } from '@/hooks/useTeamMembersExpanded';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeleteTeamDialog } from '@/components/office-manager/DeleteTeamDialog';
import { EditUserDialog } from './EditUserDialog';
import { SmartDeleteUserDialog } from './SmartDeleteUserDialog';
import { useSmartRemoveTeamMember } from '@/hooks/useSmartRemoveTeamMember';
import { SmartRemoveTeamMemberDialog, type RemovalOptions } from './SmartRemoveTeamMemberDialog';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { ManageTeamDialog } from './ManageTeamDialog';
import { getRoleBadgeColor, getRoleDisplayName } from '@/lib/rbac';
import type { AppRole } from '@/lib/rbac';

// Role priority for sorting (lower number = higher priority)
const getRolePriority = (role: string): number => {
  const priorities: Record<string, number> = {
    'platform_admin': 1,
    'office_manager': 2,
    'team_leader': 3,
    'salesperson': 4,
    'assistant': 5,
  };
  return priorities[role] || 999; // Unknown roles go to end
};

const TeamMembersRow = ({
  teamId,
  teamName,
  onEditUser, 
  onDeleteUser,
  onRemoveFromTeam
}: { 
  teamId: string;
  teamName: string;
  onEditUser: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onRemoveFromTeam: (user: any) => void;
}) => {
  const { data: members, isLoading } = useTeamMembersExpanded(teamId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No members in this team</p>
      </div>
    );
  }

  // Sort members by role priority
  const sortedMembers = [...members].sort((a, b) => {
    const aPriority = getRolePriority(a.roles?.[0] || '');
    const bPriority = getRolePriority(b.roles?.[0] || '');
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // If same priority, sort alphabetically by name
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-muted/30">
      {sortedMembers.map((member) => (
        <div
          key={member.id}
          className="relative flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-md transition-all group cursor-pointer"
          onClick={() => !member.isPending && onEditUser({ ...member, access_level: member.access_level, team_id: teamId })}
        >
          {member.isPending ? (
            // Pending user: Show prominent pending indicator instead of avatar
            <>
              <div className="h-14 w-14 rounded-full bg-warning/20 border-2 border-warning flex items-center justify-center">
                <Badge 
                  variant="secondary" 
                  className="text-xs font-semibold bg-warning/30 text-warning border-warning px-2"
                >
                  Pending
                </Badge>
              </div>
              <div className="text-center w-full">
                <div className="font-medium text-sm truncate" title={member.full_name}>
                  {member.full_name || 'Invited User'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {member.email}
                </div>
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {member.roles?.map((role: string) => (
                    <Badge 
                      key={role}
                      variant="outline"
                      className={`text-xs ${getRoleBadgeColor(role as AppRole)}`}
                    >
                      {getRoleDisplayName(role as AppRole)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          ) : (
            // Active user: Show normal avatar and info
            <>
              <Avatar className="h-14 w-14">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>
                  {member.full_name?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full">
                <div className="font-medium text-sm truncate" title={member.full_name}>
                  {member.full_name || 'Unknown'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {member.email}
                </div>
                <div className="flex flex-wrap gap-1 justify-center mt-1">
                  {member.roles?.map((role: string) => (
                    <Badge 
                      key={role}
                      variant="outline"
                      className={`text-xs ${getRoleBadgeColor(role as AppRole)}`}
                    >
                      {getRoleDisplayName(role as AppRole)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

interface TeamsSectionProps {
  onInviteToTeam?: (teamId: string, officeId: string) => void;
}

export const TeamsSection = ({ onInviteToTeam }: TeamsSectionProps) => {
  const { teams, isLoading } = useOfficeTeamsUsers();
  const [manageTeam, setManageTeam] = useState<any>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [removeFromTeamUser, setRemoveFromTeamUser] = useState<any>(null);
  const { mutateAsync: smartRemoveTeamMember } = useSmartRemoveTeamMember();
  const { deleteUser: deleteUserMutation } = useAdminUsers();

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const handleSmartRemoval = async (options: RemovalOptions) => {
    await smartRemoveTeamMember(options);
    setRemoveFromTeamUser(null);
  };

  const handleDeleteUser = async () => {
    if (deleteUser) {
      await deleteUserMutation.mutateAsync(deleteUser.id);
      setDeleteUser(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground">
              Create your first team to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Teams ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const isExpanded = expandedTeams.has(team.id);
                return (
                  <Collapsible
                    key={team.id}
                    open={isExpanded}
                    onOpenChange={() => toggleTeam(team.id)}
                  >
                    <TableRow className="cursor-pointer hover:bg-accent/50">
                      <CollapsibleTrigger asChild>
                        <TableCell className="py-6">
                          <div className="grid grid-cols-[1fr_200px_100px_180px] items-center gap-6 w-full">
                            <div className="flex items-center gap-4 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform flex-shrink-0" />
                              )}
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={team.logo_url || undefined} />
                                <AvatarFallback>
                                  {team.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-base truncate">{team.name}</div>
                                {team.team_code && (
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {team.team_code}
                                  </div>
                                )}
                              </div>
                            </div>

                            {team.leader ? (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  <AvatarImage src={team.leader.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {team.leader.full_name?.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{team.leader.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No leader</span>
                            )}

                            <div className="flex items-center gap-2.5 justify-center">
                              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium">{team.memberCount}</span>
                            </div>

                            <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                              <Button
                                variant="outline"
                                size="default"
                                onClick={() => setManageTeam(team)}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Team
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </CollapsibleTrigger>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell className="p-0">
                          <TeamMembersRow 
                            teamId={team.id}
                            teamName={team.name}
                            onEditUser={setEditUser}
                            onDeleteUser={setDeleteUser}
                            onRemoveFromTeam={setRemoveFromTeamUser}
                          />
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {manageTeam && (
        <ManageTeamDialog
          team={manageTeam}
          open={!!manageTeam}
          onOpenChange={(open) => !open && setManageTeam(null)}
          onInviteClick={() => {
            onInviteToTeam?.(manageTeam.id, manageTeam.agency_id);
          }}
        />
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
        />
      )}

      {deleteUser && (
        <SmartDeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}

      {removeFromTeamUser && (() => {
        const teamMembers = expandedTeams.has(removeFromTeamUser.team_id) 
          ? [] // Will be fetched by the dialog itself
          : [];
        
        return (
          <SmartRemoveTeamMemberDialog
            open={!!removeFromTeamUser}
            onOpenChange={(open) => !open && setRemoveFromTeamUser(null)}
            user={removeFromTeamUser}
            teamMembers={teamMembers}
            onConfirm={handleSmartRemoval}
          />
        );
      })()}
    </>
  );
};

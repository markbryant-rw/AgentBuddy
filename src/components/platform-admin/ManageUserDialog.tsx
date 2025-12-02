import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Shield, Trash2, Edit2, X, Plus, Check, Copy, Users, Key, Info, UserCog } from 'lucide-react';
import { usePlatformUserDetail } from '@/hooks/usePlatformUserDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlatformUserManagement } from '@/hooks/usePlatformUserManagement';
import { getRoleBadgeVariant, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { format } from 'date-fns';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useViewAs } from '@/hooks/useViewAs';
import { ViewAsReasonDialog } from './ViewAsReasonDialog';
import { useNavigate } from 'react-router-dom';

const ALL_ROLES: AppRole[] = ['platform_admin', 'office_manager', 'team_leader', 'salesperson', 'assistant'];

interface ManageUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export const ManageUserDialog = ({ open, onOpenChange, userId }: ManageUserDialogProps) => {
  const navigate = useNavigate();
  const { startViewingAs } = useViewAs();
  const { data: user, isLoading } = usePlatformUserDetail(userId || undefined);
  const { 
    updateUserProfile, 
    deleteUser, 
    generateTempPassword,
    suspendUser, 
    reactivateUser, 
    resetPassword, 
    addUserRole, 
    revokeUserRole, 
    changeUserOffice, 
    changeUserTeam,
    addTeamMembership,
    removeTeamMembership 
  } = usePlatformUserManagement();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [editedMobile, setEditedMobile] = useState('');
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [editedBirthday, setEditedBirthday] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [isViewAsReasonDialogOpen, setIsViewAsReasonDialogOpen] = useState(false);
  const [isViewingAs, setIsViewingAs] = useState(false);
  
  // Fetch all offices for the office selector
  const { data: offices } = useQuery({
    queryKey: ['all-offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data;
    }
  });
  
  // Fetch teams for selected office
  const { data: teams } = useQuery({
    queryKey: ['office-teams', user?.office?.id],
    queryFn: async () => {
      if (!user?.office?.id) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', user.office.id)
        .eq('is_personal_team', false)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.office?.id
  });

  if (isLoading || !user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
          </DialogHeader>
          <Skeleton className="h-[600px] w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  const activeRoles = user.roles.filter(r => !r.revoked_at) || [];
  const availableRoles = ALL_ROLES.filter(
    role => !activeRoles.some(r => r.role === role)
  );

  const handleDeleteUser = () => {
    if (!userId) return;
    deleteUser.mutate(userId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        onOpenChange(false);
      }
    });
  };

  const handleViewAsClick = () => {
    setIsViewAsReasonDialogOpen(true);
  };

  const handleViewAsConfirm = async (reason: string) => {
    if (!userId) return;
    try {
      setIsViewingAs(true);
      await startViewingAs(userId, reason);
      toast.success(`Now viewing as ${user?.full_name || user?.email}`);
      setIsViewAsReasonDialogOpen(false);
      onOpenChange(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start viewing as user');
    } finally {
      setIsViewingAs(false);
    }
  };
  
  const handleSaveName = async () => {
    if (!userId || !editedName.trim()) return;
    updateUserProfile.mutate({ userId, updates: { full_name: editedName.trim() } }, {
      onSuccess: () => setIsEditingName(false)
    });
  };

  const handleSaveMobile = async () => {
    if (!userId) return;
    updateUserProfile.mutate({ userId, updates: { mobile: editedMobile.trim() || null } }, {
      onSuccess: () => setIsEditingMobile(false)
    });
  };

  const handleSaveBirthday = async () => {
    if (!userId) return;
    updateUserProfile.mutate({ userId, updates: { birthday: editedBirthday || null } }, {
      onSuccess: () => setIsEditingBirthday(false)
    });
  };

  const handleGenerateTempPassword = async () => {
    if (!userId || !user?.office?.id || !user?.primary_team?.id) {
      toast.error('User must have office and primary team configured');
      return;
    }
    const firstRole = user.roles.find(r => !r.revoked_at)?.role || 'salesperson';
    generateTempPassword.mutate(
      { 
        userId, 
        officeId: user.office.id, 
        teamId: user.primary_team.id, 
        role: firstRole 
      },
      {
        onSuccess: (data) => {
          if (data.temporaryPassword) {
            setTempPassword(data.temporaryPassword);
          }
        }
      }
    );
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied to clipboard');
    }
  };
  
  const handleAddRole = async (roleValue: string) => {
    if (!userId) return;
    addUserRole.mutate({ userId, role: roleValue as AppRole });
    setShowAddRole(false);
  };
  
  const handleRemoveRole = async (role: string) => {
    if (!userId) return;
    revokeUserRole.mutate({ userId, role: role as AppRole });
  };
  
  const handleChangeOffice = async (officeId: string) => {
    if (!userId) return;
    changeUserOffice.mutate({ userId, officeId });
  };
  
  const handleChangeTeam = async (teamId: string) => {
    if (!userId) return;
    changeUserTeam.mutate({ userId, teamId });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Manage User</DialogTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAsClick}
                disabled={isViewingAs}
                className="gap-2"
              >
                <UserCog className="h-4 w-4" />
                View As User
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {user.full_name?.charAt(0) || user.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div>
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="max-w-xs"
                            placeholder="Enter name"
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveName} disabled={updateUserProfile.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{user.full_name || 'No name set'}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditedName(user.full_name || '');
                              setIsEditingName(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      
                      {/* Mobile Number */}
                      <div className="mt-2">
                        {isEditingMobile ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editedMobile}
                              onChange={(e) => setEditedMobile(e.target.value)}
                              className="max-w-xs"
                              placeholder="Enter mobile"
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveMobile} disabled={updateUserProfile.isPending}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingMobile(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              Mobile: {user.mobile || 'Not set'}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditedMobile(user.mobile || '');
                                setIsEditingMobile(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Birthday */}
                      <div className="mt-1">
                        {isEditingBirthday ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              value={editedBirthday}
                              onChange={(e) => setEditedBirthday(e.target.value)}
                              className="max-w-xs"
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveBirthday} disabled={updateUserProfile.isPending}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingBirthday(false)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              Birthday: {user.birthday ? format(new Date(user.birthday), 'MMM d, yyyy') : 'Not set'}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditedBirthday(user.birthday || '');
                                setIsEditingBirthday(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Office</p>
                  <Select value={user.office?.id || ''} onValueChange={handleChangeOffice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices?.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Primary Team</p>
                  <Select 
                    value={user.primary_team?.id || ''} 
                    onValueChange={handleChangeTeam}
                    disabled={!user.office?.id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Team Memberships Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Team Memberships</p>
                  </div>
                  {user.team_memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not a member of any teams</p>
                  ) : (
                    <div className="space-y-2">
                      {user.team_memberships.map((membership) => (
                        <div key={membership.team_id} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{membership.team_name}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs gap-1 cursor-help">
                                    {membership.access_level}
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Access level is automatically determined by user's app role</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (window.confirm(`Remove ${user.full_name || user.email} from ${membership.team_name}?`)) {
                                removeTeamMembership.mutate({ userId: user.id, teamId: membership.team_id });
                              }
                            }}
                            disabled={removeTeamMembership.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {showAddTeam ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Select onValueChange={(teamId) => {
                        addTeamMembership.mutate({ userId: user.id, teamId });
                        setShowAddTeam(false);
                      }}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select team..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teams?.filter(t => !user.team_memberships.some(m => m.team_id === t.id)).map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddTeam(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTeam(true)}
                      className="mt-2"
                      disabled={!user.office?.id}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Team Membership
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Roles & Permissions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Roles & Permissions
                </CardTitle>
                <CardDescription>Manage user's application-wide roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {activeRoles.map((roleData) => (
                    <div key={roleData.role} className="flex items-center gap-1">
                      <Badge variant={getRoleBadgeVariant(roleData.role as AppRole)}>
                        {getRoleDisplayName(roleData.role as AppRole)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveRole(roleData.role as AppRole)}
                        disabled={revokeUserRole.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {showAddRole ? (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => handleAddRole(value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddRole(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddRole(true)}
                    disabled={availableRoles.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Role
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Account Security Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="h-5 w-5" />
                  Account Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Generate a temporary password for this user</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateTempPassword}
                      disabled={generateTempPassword.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Generate Temporary Password
                    </Button>
                  </div>
                  {tempPassword && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-sm font-mono">{tempPassword}</code>
                        <Button size="sm" variant="ghost" onClick={handleCopyPassword}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        User will be prompted to change this password on first login
                      </p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex gap-2">
                  {user.status === 'active' ? (
                    <Button
                      onClick={() => {
                        if (!userId) return;
                        suspendUser.mutate(userId);
                      }}
                      disabled={suspendUser.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Suspend Account
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (!userId) return;
                        reactivateUser.mutate(userId);
                      }}
                      disabled={reactivateUser.isPending}
                      size="sm"
                      variant="outline"
                    >
                      Reactivate Account
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (!userId) return;
                      resetPassword.mutate(userId);
                    }}
                    disabled={resetPassword.isPending}
                    size="sm"
                    variant="outline"
                  >
                    Send Password Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteUser.isPending}
                  variant="destructive"
                  size="sm"
                >
                  Delete User
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[11001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {user.full_name || user.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewAsReasonDialog
        open={isViewAsReasonDialogOpen}
        onOpenChange={setIsViewAsReasonDialogOpen}
        onConfirm={handleViewAsConfirm}
        userName={user?.full_name || user?.email || 'this user'}
      />
    </>
  );
};

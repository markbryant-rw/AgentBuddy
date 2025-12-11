import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useInvitations } from '@/hooks/useInvitations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Mail, Loader2, RefreshCw, XCircle, Clock, Info } from 'lucide-react';
import { getInvitableRoles, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { RoleBadge } from '@/components/RoleBadge';
import { validateEmail } from '@/lib/validation';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function InviteUser() {
  const { roles, user, hasRole, activeRole } = useAuth();
  const { profile } = useProfile();
  const { team } = useTeam();
  
  // Use activeRole for view-based filtering (not hasRole which checks all roles)
  const isPlatformAdminView = activeRole === 'platform_admin';
  const isOfficeManagerView = activeRole === 'office_manager';
  const isTeamLeaderView = activeRole === 'team_leader' || activeRole === 'salesperson' || activeRole === 'assistant';
  
  // Legacy role checks for form behavior (what roles user CAN invite)
  const isPlatformAdmin = hasRole('platform_admin');
  const isOfficeManager = hasRole('office_manager');
  const isTeamLeader = hasRole('team_leader');

  // Filter invitations by ACTIVE ROLE context (not all roles user has)
  const { pendingInvitations, isLoading, inviteUser, resendInvitation, revokeInvitation, isInviting, isResending } = useInvitations({
    teamId: isTeamLeaderView ? team?.id : undefined,
    officeId: isOfficeManagerView ? profile?.office_id : undefined,
    showAll: isPlatformAdminView,
  });
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [fullName, setFullName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [emailError, setEmailError] = useState('');

  // Note: Server now handles context validation
  // Team Leaders: server forces their office + team
  // Office Managers: server forces their office, allows team selection
  // Platform Admins: use InviteUserPlatform.tsx (full control)

  // Get roles current user can invite
  const primaryRole = roles[0] as AppRole;
  const invitableRoles = getInvitableRoles(primaryRole);

  // Fetch teams for team selection
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('is_archived', false)
        .eq('is_orphan_team', false)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch current user's office name for display
  const { data: currentOffice } = useQuery({
    queryKey: ['current-office', profile?.office_id],
    queryFn: async () => {
      if (!profile?.office_id) return null;
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', profile.office_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isPlatformAdmin && !!profile?.office_id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      return;
    }
    setEmailError('');

    if (!selectedRole) {
      return;
    }

    // For team leaders, don't send teamId/officeId - server derives from their profile
    // For office managers, only send teamId (server derives officeId from their profile)
    inviteUser({
      email: email.toLowerCase().trim(),
      role: selectedRole,
      fullName: fullName.trim() || undefined,
      teamId: isTeamLeader ? undefined : (selectedTeamId || undefined),
      officeId: undefined, // Server always derives this
    });

    // Reset form
    setEmail('');
    setSelectedRole('');
    setFullName('');
    if (!isTeamLeader) {
      setSelectedTeamId('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Invite Users"
        description="Send invitations to add new members to your organization"
      />
      
      <div className="container mx-auto py-8 px-4 max-w-6xl">

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Send Invitation
            </CardTitle>
            <CardDescription>
              Enter the details of the person you want to invite
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Context Info */}
            {isTeamLeader && team && currentOffice && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  New member will be added to your team: <strong>{team.name}</strong> ({currentOffice.name})
                </AlertDescription>
              </Alert>
            )}
            {isOfficeManager && currentOffice && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  New member will be added to: <strong>{currentOffice.name}</strong>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value) validateEmail(e.target.value);
                  }}
                  required
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (Optional)</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invitableRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    You don't have permission to invite users
                  </p>
                )}
              </div>

              {/* Team selection - only for Office Managers (Team Leaders have fixed team) */}
              {!isTeamLeader && (
                <div className="space-y-2">
                  <Label htmlFor="team">Team (Optional)</Label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                  >
                    <SelectTrigger id="team">
                      <SelectValue placeholder="Select a team or create personal team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Create personal team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to create a personal team (team of one)
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isInviting || invitableRoles.length === 0}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations awaiting acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingInvitations && pendingInvitations.length > 0 ? (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={invitation.role as AppRole} />
                          <span className="text-xs text-muted-foreground">
                            Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resendInvitation(invitation.id)}
                              disabled={isResending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Resend invitation email</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => revokeInvitation(invitation.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke invitation</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending invitations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

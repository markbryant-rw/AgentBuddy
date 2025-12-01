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
import { emailSchema } from '@/lib/validation';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';

export default function InviteUser() {
  const { roles, user, hasRole } = useAuth();
  const { profile } = useProfile();
  const { team } = useTeam();
  const { pendingInvitations, isLoading, inviteUser, resendInvitation, revokeInvitation, isInviting, isResending } = useInvitations();
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [fullName, setFullName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [emailError, setEmailError] = useState('');

  // Smart context assignment based on inviter's role
  const isPlatformAdmin = hasRole('platform_admin');
  const isOfficeManager = hasRole('office_manager');
  const isTeamLeader = hasRole('team_leader');

  // Auto-set office and team based on inviter's context
  useEffect(() => {
    if (!isPlatformAdmin) {
      // Office Managers and Team Leaders: auto-set office_id
      if (profile?.office_id && !selectedOfficeId) {
        setSelectedOfficeId(profile.office_id);
      }
      
      // Team Leaders: also auto-set team_id
      if (isTeamLeader && team?.id && !selectedTeamId) {
        setSelectedTeamId(team.id);
      }
    }
  }, [profile?.office_id, team?.id, isPlatformAdmin, isTeamLeader, selectedOfficeId, selectedTeamId]);

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
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch agencies/offices for office selection
  const { data: offices = [] } = useQuery({
    queryKey: ['offices-for-invite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: roles.includes('platform_admin') || roles.includes('office_manager'),
  });

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setEmailError('');
      return true;
    } catch (error: any) {
      setEmailError(error.errors[0]?.message || 'Invalid email');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email) || !selectedRole) {
      return;
    }

    inviteUser({
      email: email.toLowerCase().trim(),
      role: selectedRole,
      fullName: fullName.trim() || undefined,
      teamId: selectedTeamId || undefined,
      officeId: selectedOfficeId || undefined,
    });

    // Reset form
    setEmail('');
    setSelectedRole('');
    setFullName('');
    setSelectedTeamId('');
    setSelectedOfficeId('');
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
            {/* Smart Context Info */}
            {!isPlatformAdmin && (selectedOfficeId || selectedTeamId) && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {isTeamLeader && selectedTeamId && selectedOfficeId
                    ? 'New member will be added to your team and office automatically'
                    : isOfficeManager && selectedOfficeId
                    ? 'New member will be added to your office automatically'
                    : 'Context will be assigned automatically'}
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

              {(isPlatformAdmin || isOfficeManager) && (
                <div className="space-y-2">
                  <Label htmlFor="office">
                    Office {!isPlatformAdmin && selectedOfficeId ? '(Auto-assigned)' : '(Optional)'}
                  </Label>
                  <Select 
                    value={selectedOfficeId} 
                    onValueChange={setSelectedOfficeId}
                    disabled={!isPlatformAdmin && !!selectedOfficeId}
                  >
                    <SelectTrigger id="office">
                      <SelectValue placeholder="Select an office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No office</SelectItem>
                      {offices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team">
                  Team {isTeamLeader && selectedTeamId ? '(Auto-assigned)' : '(Optional)'}
                </Label>
                <Select 
                  value={selectedTeamId} 
                  onValueChange={setSelectedTeamId}
                  disabled={isTeamLeader && !!selectedTeamId}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resendInvitation(invitation.id)}
                          disabled={isResending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeInvitation(invitation.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
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

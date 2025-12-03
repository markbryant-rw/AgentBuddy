import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInvitations } from '@/hooks/useInvitations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Mail, Loader2, RefreshCw, XCircle, Clock, Building2, Users } from 'lucide-react';
import { getInvitableRoles, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { RoleBadge } from '@/components/RoleBadge';
import { emailSchema } from '@/lib/validation';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { toast } from 'sonner';

/**
 * Platform Admin Invite User Page
 *
 * Allows platform admins to:
 * - Invite users to any office
 * - Assign to existing teams OR create personal "team of one"
 * - Full control over all invitation parameters
 */
export default function InviteUserPlatform() {
  const { roles } = useAuth();
  const { pendingInvitations, isLoading, inviteUser, resendInvitation, revokeInvitation, isInviting, isResending } = useInvitations();

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [fullName, setFullName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [emailError, setEmailError] = useState('');

  // Get roles platform admin can invite (all roles)
  const primaryRole = roles[0] as AppRole;
  const invitableRoles = getInvitableRoles(primaryRole);

  // Fetch all offices
  const { data: offices = [], isLoading: loadingOffices } = useQuery({
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
  });

  // Fetch teams filtered by selected office
  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['teams-for-invite', selectedOfficeId],
    queryFn: async () => {
      if (!selectedOfficeId) return [];

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, is_personal_team')
        .eq('agency_id', selectedOfficeId)
        .eq('is_archived', false)
        .eq('is_orphan_team', false)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOfficeId,
  });

  // Reset team selection when office changes
  useEffect(() => {
    setSelectedTeamId('');
  }, [selectedOfficeId]);

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

    if (!validateEmail(email) || !selectedRole || !selectedOfficeId) {
      if (!selectedOfficeId) {
        toast.error('Please select an office');
      }
      return;
    }

    try {
      await inviteUser({
        email: email.toLowerCase().trim(),
        role: selectedRole,
        fullName: fullName.trim() || undefined,
        teamId: selectedTeamId || undefined,
        officeId: selectedOfficeId,
      });

      // Reset form
      setEmail('');
      setSelectedRole('');
      setFullName('');
      setSelectedTeamId('');
      // Keep office selected for convenience
    } catch (error) {
      // Error already shown by useInvitations hook
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Invite New User"
        description="Add users to any office with full administrative control"
        backPath="/platform-admin"
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
                As a platform admin, you have full control over user invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Building2 className="h-4 w-4" />
                <AlertTitle>Platform Admin Powers</AlertTitle>
                <AlertDescription>
                  You can invite users to any office and either assign them to an existing team
                  or let the system create a personal workspace for them.
                </AlertDescription>
              </Alert>

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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="office">Office *</Label>
                  <Select
                    value={selectedOfficeId}
                    onValueChange={setSelectedOfficeId}
                  >
                    <SelectTrigger id="office">
                      <SelectValue placeholder="Select an office" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingOffices ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading offices...</div>
                      ) : offices.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No offices available</div>
                      ) : (
                        offices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The user will belong to this office
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team (Optional)</Label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                    disabled={!selectedOfficeId}
                  >
                    <SelectTrigger id="team">
                      <SelectValue placeholder={selectedOfficeId ? "Select a team or leave empty" : "Select an office first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span>Create personal team</span>
                        </div>
                      </SelectItem>
                      {loadingTeams ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading teams...</div>
                      ) : teams.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No teams in this office</div>
                      ) : (
                        teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                            {team.is_personal_team && <span className="text-xs text-muted-foreground ml-2">(Personal)</span>}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {selectedTeamId
                      ? "User will be added to the selected team"
                      : "A personal workspace will be created for the user"}
                  </p>
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
                Recent Invitations
              </CardTitle>
              <CardDescription>
                Invitations awaiting acceptance across all offices
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
                  {pendingInvitations.slice(0, 10).map((invitation) => (
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
                            title="Resend invitation"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeInvitation(invitation.id)}
                            title="Revoke invitation"
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

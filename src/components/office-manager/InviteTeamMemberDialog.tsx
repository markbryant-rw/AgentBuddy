import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useInvitations } from '@/hooks/useInvitations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getInvitableRoles, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { validateEmail } from '@/lib/validation';
import { Loader2, UserPlus, Copy } from 'lucide-react';
import { RoleBadge } from '@/components/RoleBadge';
import { InvitationWarningDialog } from './InvitationWarningDialog';
import { logger } from '@/lib/logger';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officeId: string;
  defaultTeamId?: string;
}

export function InviteTeamMemberDialog({ open, onOpenChange, officeId, defaultTeamId }: InviteTeamMemberDialogProps) {
  const { roles } = useAuth();
  const { inviteUser, isInviting, resendInvitation, reactivateUser } = useInvitations();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultTeamId || '');
  const [emailError, setEmailError] = useState('');
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    type: 'already_invited' | 'user_exists' | 'user_inactive' | null;
    data?: any;
  }>({ open: false, type: null });
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  const primaryRole = roles[0] as AppRole;
  const invitableRoles = getInvitableRoles(primaryRole);

  // Set default team when dialog opens
  useEffect(() => {
    if (open && defaultTeamId) {
      setSelectedTeamId(defaultTeamId);
    }
  }, [open, defaultTeamId]);

  // Fetch teams for this office
  const { data: teams = [] } = useQuery({
    queryKey: ['office-teams', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', officeId)
        .eq('is_personal_team', false)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!officeId,
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

    try {
      const data = await inviteUser({
        email,
        role: selectedRole,
        teamId: selectedTeamId === 'solo' ? undefined : selectedTeamId || undefined,
        officeId,
        fullName: fullName.trim() || undefined,
      });

      // Check for warnings
      if (data?.warning) {
        logger.info("[InviteTeamMemberDialog] Received warning from invite-user", { 
          warning: data.warning, 
          email, 
          officeId, 
          selectedTeamId, 
          selectedRole 
        });
        if (data.warning === 'already_invited') {
          setWarningDialog({
            open: true,
            type: 'already_invited',
            data: data
          });
        } else if (data.warning === 'user_exists') {
          setWarningDialog({
            open: true,
            type: 'user_exists',
            data: data
          });
        } else if (data.warning === 'user_inactive') {
          setWarningDialog({
            open: true,
            type: 'user_inactive',
            data: data
          });
        }
      } else {
        // Success - clear form and close
        setEmail('');
        setFullName('');
        setSelectedRole('');
        setSelectedTeamId('solo');
        onOpenChange(false);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleWarningConfirm = async () => {
    if (warningDialog.type === 'already_invited') {
      try {
        logger.info("[InviteTeamMemberDialog] Resending invitation", { 
          email, 
          invitationId: warningDialog.data?.invitation_id 
        });
        await resendInvitation(warningDialog.data.invitation_id);
        setWarningDialog({ open: false, type: null, data: undefined });
        setEmail('');
        setFullName('');
        setSelectedRole('');
        setSelectedTeamId('solo');
        onOpenChange(false);
      } catch (error) {
        logger.error("[InviteTeamMemberDialog] Failed to resend invitation", error, { email, invitationId: warningDialog.data?.invitation_id });
      }
    } else if (warningDialog.type === 'user_exists' && warningDialog.data?.profile?.is_orphaned) {
      // Handle orphaned user repair
      if (!selectedRole) return;
      try {
        logger.info("[InviteTeamMemberDialog] Repairing orphaned user", { 
          email, 
          profileId: warningDialog.data?.profile?.id, 
          officeId, 
          teamId: selectedTeamId === 'solo' ? null : selectedTeamId || null, 
          role: selectedRole 
        });
        const { data: repairData, error: repairError } = await supabase.functions.invoke('repair-user', {
          body: {
            userId: warningDialog.data.profile.id,
            officeId,
            teamId: selectedTeamId === 'solo' ? undefined : selectedTeamId || undefined,
            role: selectedRole,
            resetPassword: true
          }
        });

        if (repairError) throw repairError;
        if (repairData?.error) throw new Error(repairData.error);

        if (repairData?.temporaryPassword) {
          setTempPassword({
            email: warningDialog.data.profile.email,
            password: repairData.temporaryPassword
          });
          toast.success(`Account repaired for ${warningDialog.data.profile.email}`);
        }
        
        setWarningDialog({ open: false, type: null, data: undefined });
        setEmail('');
        setFullName('');
        setSelectedRole('');
        setSelectedTeamId('solo');
      } catch (error: any) {
        logger.error("[InviteTeamMemberDialog] Failed to repair orphaned user", error, { 
          email, 
          profileId: warningDialog.data?.profile?.id 
        });
        toast.error(error.message || 'Failed to repair account');
      }
    } else if (warningDialog.type === 'user_inactive') {
      if (!selectedRole) return; // Guard against empty role
      try {
        logger.info("[InviteTeamMemberDialog] Reactivating inactive user", { 
          email, 
          profileId: warningDialog.data?.profile?.id, 
          officeId, 
          teamId: selectedTeamId === 'solo' ? null : selectedTeamId || null, 
          role: selectedRole 
        });
        await reactivateUser({
          userId: warningDialog.data.profile.id,
          email,
          role: selectedRole,
          teamId: selectedTeamId === 'solo' ? undefined : selectedTeamId || undefined,
          officeId,
        });
        setWarningDialog({ open: false, type: null, data: undefined });
        setEmail('');
        setFullName('');
        setSelectedRole('');
        setSelectedTeamId('solo');
        onOpenChange(false);
      } catch (error) {
        logger.error("[InviteTeamMemberDialog] Failed to reactivate user", error, { 
          email, 
          profileId: warningDialog.data?.profile?.id 
        });
      }
    } else {
      setWarningDialog({ open: false, type: null, data: undefined });
    }
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword.password);
      toast.success("Password copied to clipboard");
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setWarningDialog({ open: false, type: null, data: undefined });
      setTempPassword(null);
      setEmail('');
      setFullName('');
      setSelectedRole('');
      setSelectedTeamId(defaultTeamId || 'solo');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your office. They'll receive an email with instructions to set up their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
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
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border shadow-md" sideOffset={5}>
                {invitableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} size="sm" />
                      <span>{getRoleDisplayName(role)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!defaultTeamId && (
            <div className="space-y-2">
              <Label htmlFor="team">Team Assignment</Label>
              <Select value={selectedTeamId || 'solo'} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select a team or solo agent..." />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-popover border shadow-md" sideOffset={5}>
                  <SelectItem value="solo">Solo Agent (No Team)</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {defaultTeamId && (
            <div className="space-y-2">
              <Label>Team Assignment</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm">
                {teams.find(t => t.id === defaultTeamId)?.name || 'Selected Team'}
              </div>
              <p className="text-xs text-muted-foreground">
                This user will be invited to join the selected team.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting || !email || !selectedRole || warningDialog.open}>
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      <InvitationWarningDialog
        open={warningDialog.open}
        onOpenChange={(open) => setWarningDialog({ open, type: null, data: undefined })}
        warningType={warningDialog.type}
        email={email}
        onConfirm={handleWarningConfirm}
        onCancel={() => setWarningDialog({ open: false, type: null, data: undefined })}
        data={warningDialog.data}
      />

      <AlertDialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary Password Created</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 pt-4">
                <div>
                  Account repaired for <strong>{tempPassword?.email}</strong>
                </div>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="text-sm font-medium">Temporary Password:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded border text-lg font-mono">
                      {tempPassword?.password}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyPassword}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Please share this password securely with the user. They will be required to change it after their first login.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => { setTempPassword(null); onOpenChange(false); }}>
              Done
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

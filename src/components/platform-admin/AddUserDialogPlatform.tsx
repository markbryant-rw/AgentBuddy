import { useState } from 'react';
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
import { Loader2, UserPlus } from 'lucide-react';
import { RoleBadge } from '@/components/RoleBadge';
import { InvitationWarningDialog } from '@/components/office-manager/InvitationWarningDialog';
import { VoucherSelect } from './VoucherSelect';
import { toast } from 'sonner';

interface AddUserDialogPlatformProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officeId: string;
}

export function AddUserDialogPlatform({ open, onOpenChange, officeId }: AddUserDialogPlatformProps) {
  const { roles } = useAuth();
  const { inviteUser, isInviting, resendInvitation, reactivateUser } = useInvitations();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedVoucher, setSelectedVoucher] = useState<string>('standard');
  const [emailError, setEmailError] = useState('');
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    type: 'already_invited' | 'user_exists' | 'user_inactive' | null;
    data?: any;
  }>({ open: false, type: null });

  const primaryRole = roles[0] as AppRole;
  const invitableRoles = getInvitableRoles(primaryRole);

  // Fetch teams for this office
  const { data: teams = [] } = useQuery({
    queryKey: ['office-teams', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, license_type')
        .eq('agency_id', officeId)
        .eq('is_personal_team', false)
        .eq('is_archived', false)
        .eq('is_orphan_team', false)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!officeId,
  });

  const applyVoucherToTeam = async (teamId: string, voucherCode: string) => {
    const { data, error } = await supabase.functions.invoke('redeem-voucher', {
      body: { code: voucherCode, teamId },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

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
        teamId: selectedTeamId || undefined,
        officeId,
        fullName: fullName.trim() || undefined,
      });

      // Check for warnings
      if (data?.warning) {
        if (data.warning === 'already_invited') {
          setWarningDialog({ open: true, type: 'already_invited', data });
        } else if (data.warning === 'user_exists') {
          setWarningDialog({ open: true, type: 'user_exists', data });
        } else if (data.warning === 'user_inactive') {
          setWarningDialog({ open: true, type: 'user_inactive', data });
        }
      } else {
        // Success - apply voucher if selected and team assigned
        if (selectedTeamId && selectedVoucher && selectedVoucher !== 'standard') {
          try {
            setIsApplyingVoucher(true);
            await applyVoucherToTeam(selectedTeamId, selectedVoucher);
            toast.success(`User invited and ${selectedVoucher} license applied`);
          } catch (voucherError: any) {
            toast.error(`User invited but license failed: ${voucherError.message}`);
          } finally {
            setIsApplyingVoucher(false);
          }
        }
        resetFormAndClose();
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetFormAndClose = () => {
    setEmail('');
    setFullName('');
    setSelectedRole('');
    setSelectedTeamId('');
    setSelectedVoucher('standard');
    onOpenChange(false);
  };

  const handleWarningConfirm = async () => {
    if (warningDialog.type === 'already_invited') {
      try {
        await resendInvitation(warningDialog.data.invitation_id);
        setWarningDialog({ open: false, type: null, data: undefined });
        resetFormAndClose();
      } catch (error) {
        // Error handled by mutation
      }
    } else if (warningDialog.type === 'user_inactive') {
      if (!selectedRole) return;
      try {
        await reactivateUser({
          userId: warningDialog.data.profile.id,
          email,
          role: selectedRole,
          teamId: selectedTeamId || undefined,
          officeId,
        });
        setWarningDialog({ open: false, type: null, data: undefined });
        resetFormAndClose();
      } catch (error) {
        // Error handled by mutation
      }
    } else if (warningDialog.type === 'user_exists' && warningDialog.data?.profile?.is_orphaned) {
      if (!selectedRole) return;
      try {
        const { data: repairData, error: repairError } = await supabase.functions.invoke('repair-user', {
          body: {
            userId: warningDialog.data.profile.id,
            officeId,
            teamId: selectedTeamId || undefined,
            role: selectedRole,
            resetPassword: true
          }
        });

        if (repairError) throw repairError;
        if (repairData?.error) throw new Error(repairData.error);

        toast.success(`Account repaired for ${warningDialog.data.profile.email}`);
        setWarningDialog({ open: false, type: null, data: undefined });
        resetFormAndClose();
      } catch (error: any) {
        toast.error(error.message || 'Failed to repair account');
      }
    } else {
      setWarningDialog({ open: false, type: null, data: undefined });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setWarningDialog({ open: false, type: null, data: undefined });
      setEmail('');
      setFullName('');
      setSelectedRole('');
      setSelectedTeamId('');
      setSelectedVoucher('standard');
    }
    onOpenChange(open);
  };

  const showVoucherSelect = selectedTeamId && selectedTeamId !== 'solo';

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to join this office. They'll receive an email with instructions to set up their account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
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
                <SelectContent position="popper" sideOffset={5}>
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

            <div className="space-y-2">
              <Label htmlFor="team">Team Assignment</Label>
              <Select value={selectedTeamId || 'solo'} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select a team or solo agent..." />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5}>
                  <SelectItem value="solo">Solo Agent (No Team)</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showVoucherSelect && (
              <VoucherSelect
                value={selectedVoucher}
                onValueChange={setSelectedVoucher}
                disabled={isInviting || isApplyingVoucher}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isInviting || isApplyingVoucher}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting || isApplyingVoucher || !email || !selectedRole || warningDialog.open}>
                {isInviting || isApplyingVoucher ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isApplyingVoucher ? 'Applying License...' : 'Sending...'}
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
      </Dialog>

      <InvitationWarningDialog
        open={warningDialog.open}
        onOpenChange={(open) => setWarningDialog({ open, type: null, data: undefined })}
        warningType={warningDialog.type}
        email={email}
        onConfirm={handleWarningConfirm}
        onCancel={() => setWarningDialog({ open: false, type: null, data: undefined })}
        data={warningDialog.data}
      />
    </>
  );
}

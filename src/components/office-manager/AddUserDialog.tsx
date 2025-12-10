import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useInvitations } from '@/hooks/useInvitations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { getInvitableRoles, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { validateEmail } from '@/lib/validation';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
  const { roles } = useAuth();
  const { profile } = useProfile();
  const { activeOffice } = useOfficeSwitcher();
  const { inviteUser, isInviting } = useInvitations();
  
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [emailError, setEmailError] = useState('');

  // Get roles current user can invite
  const primaryRole = roles[0] as AppRole;
  const invitableRoles = getInvitableRoles(primaryRole);

  // Fetch teams in the current office
  const { data: teams = [] } = useQuery({
    queryKey: ['office-teams', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', activeOffice.id)
        .eq('is_archived', false)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeOffice?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Invalid email');
      return;
    }
    setEmailError('');

    if (!selectedRole || !activeOffice?.id) {
      return;
    }

    await inviteUser({
      email,
      role: selectedRole,
      fullName: fullName || undefined,
      teamId: selectedTeamId || undefined,
      officeId: activeOffice.id,
    });

    // Reset form and close
    setEmail('');
    setFullName('');
    setSelectedRole('');
    setSelectedTeamId('');
    setEmailError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Invite a new user to {activeOffice?.name || 'the office'}. Role is required, team is optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => email && validateEmail(email)}
              required
            />
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
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
            <p className="text-xs text-muted-foreground">
              Required: Determines user's permissions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team (Optional)</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger id="team">
                <SelectValue placeholder="No team (solo agent)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No team (solo agent)</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If not selected, user will be a solo agent
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isInviting || !selectedRole || !email || !!emailError}
              className="flex-1"
            >
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
    </Dialog>
  );
}

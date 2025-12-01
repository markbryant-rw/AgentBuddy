import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Loader2, Mail, UserSearch, Users, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { UserSearchCombobox } from './UserSearchCombobox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function InviteTeamMemberDialog() {
  const { user } = useAuth();
  const { team } = useTeam();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState('email');

  // Validation: Verify team exists when dialog opens
  useEffect(() => {
    if (open && team?.id) {
      // Validate team is still valid
      const validateTeam = async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', team.id)
          .single();
        
        if (error || !data) {
          console.error('Team validation failed:', error);
          toast.error('Team context invalid. Please try again.');
          setOpen(false);
        }
      };
      validateTeam();
    }
  }, [open, team?.id]);

  const handleEmailInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!team?.id) {
      toast.error('No team found');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-team-invite', {
        body: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          teamId: team.id,
          role: role,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast.success(`Invitation sent to ${email}!`, {
        description: 'They should receive it within a few minutes',
      });
      setEmail('');
      setFullName('');
      setRole('member');
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      
      // Provide specific error messages based on the error type
      if (error.message?.includes('RESEND_API_KEY') || error.message?.includes('email service')) {
        toast.error('Email service not configured', {
          description: 'Please contact your administrator to set up email sending',
          duration: 7000,
        });
      } else if (error.message?.includes('already exists') || error.message?.includes('already has an account')) {
        toast.error('User already exists', {
          description: 'Switch to "Add Existing User" tab to add them directly',
          duration: 5000,
        });
        setActiveTab('search');
      } else if (error.message?.includes('Rate limit') || error.message?.includes('rate limit')) {
        toast.error('Too many invitations sent', {
          description: 'Please wait before sending more invitations',
          duration: 5000,
        });
      } else {
        toast.error('Failed to send invitation', {
          description: error.message || 'Please try again or contact support',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddExisting = async () => {
    if (!selectedUser || !team?.id || !user) {
      toast.error('Please select a user');
      return;
    }

    setLoading(true);
    try {
      // Double-check if already a member
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', selectedUser.id)
        .eq('team_id', team.id)
        .maybeSingle();

      if (existing) {
        toast.error('User is already a team member');
        return;
      }

      // Add to team_members (access_level will be auto-computed by trigger)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: selectedUser.id,
          team_id: team.id,
        });

      if (memberError) throw memberError;

      // Send in-app notification
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedUser.id,
          type: 'team_added',
          title: 'Added to team',
          message: `${profile?.full_name || user.email} added you to ${team.name}`,
          metadata: { team_id: team.id, added_by: user.id },
        });

      toast.success(`${selectedUser.full_name || selectedUser.email} added to team!`);
      setSelectedUser(null);
      setRole('member');
      setOpen(false);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user to team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite new users via email or add existing users directly to your team.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invite New User</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <UserSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Add Existing User</span>
              <span className="sm:hidden">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Send an email invitation to someone who doesn't have an account yet.
            </p>
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="Loryn Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Pre-fill their name to simplify signup
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-role">Role *</Label>
              <Select value={role} onValueChange={(value: 'member' | 'admin') => setRole(value)} disabled={loading}>
                <SelectTrigger id="email-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleEmailInvite} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Search for users who already have an account and add them directly.
            </p>
            <div className="space-y-2">
              <Label htmlFor="user-search">Search User *</Label>
              <UserSearchCombobox 
                selectedUser={selectedUser}
                onSelect={setSelectedUser}
              />
              <p className="text-xs text-muted-foreground">
                Search by name or email address
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-role">Role *</Label>
              <Select value={role} onValueChange={(value: 'member' | 'admin') => setRole(value)} disabled={loading}>
                <SelectTrigger id="search-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleAddExisting} disabled={loading || !selectedUser}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Team
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

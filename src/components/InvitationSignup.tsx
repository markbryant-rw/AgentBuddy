import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DateSpinner } from '@/components/ui/date-spinner';
import { normalizeNZMobile } from '@/lib/phoneUtils';
import { generateIdempotencyKey, sanitizeInput } from '@/lib/security';

interface InvitationData {
  email: string;
  full_name: string | null;
  team_id: string;
  role: 'admin' | 'member' | 'super_admin' | 'platform_admin';
}

interface TeamData {
  name: string;
  agency_id: string;
  uses_financial_year: boolean;
  financial_year_start_month: number;
  agency: {
    name: string;
  };
}

interface InvitationSignupProps {
  inviteCode: string;
}

export const InvitationSignup = ({ inviteCode }: InvitationSignupProps) => {
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState(false);
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthday, setBirthday] = useState<Date>();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Phase 1: Generate idempotency key once on mount for double-submission prevention
  const idempotencyKey = useRef(generateIdempotencyKey());
  const isSubmitting = useRef(false);

  const fetchInvitationDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch invitation details from pending_invitations
      const { data: inviteData, error: inviteError } = await supabase
        .from('pending_invitations')
        .select('email, full_name, team_id, role')
        .eq('token', inviteCode)
        .single();

      if (inviteError || !inviteData) {
        toast({
          title: 'Invalid Invitation',
          description: 'This invitation link is invalid or has expired.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      setInvitationData({
        email: inviteData.email,
        full_name: inviteData.full_name,
        team_id: inviteData.team_id,
        role: (inviteData.role || 'member') as 'admin' | 'member' | 'super_admin' | 'platform_admin',
      });

      // Fetch team details
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          name,
          agency_id,
          uses_financial_year,
          financial_year_start_month,
          agency:agencies(name)
        `)
        .eq('id', inviteData.team_id)
        .single();

      if (teamError || !team) {
        toast({
          title: 'Error',
          description: 'Unable to load team details.',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      setTeamData(team as TeamData);
    } catch (error) {
      console.error('Error fetching invitation:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  }, [inviteCode, navigate, toast]);

  useEffect(() => {
    fetchInvitationDetails();
  }, [fetchInvitationDetails]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Phase 1: Prevent double-submission
    if (isSubmitting.current) {
      console.log('Submission already in progress, ignoring duplicate');
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!mobileNumber) {
      toast({
        title: 'Mobile Number Required',
        description: 'Please enter your mobile number.',
        variant: 'destructive',
      });
      return;
    }

    if (!birthday) {
      toast({
        title: 'Date of Birth Required',
        description: 'Please select your date of birth.',
        variant: 'destructive',
      });
      return;
    }

    if (!invitationData || !teamData) return;

    // Phase 1: Mark as submitting to prevent double-clicks
    isSubmitting.current = true;
    setSigningUp(true);

    try {
      const normalizedPhone = normalizeNZMobile(mobileNumber);

      // Phase 1: Sanitize all inputs before submission
      const sanitizedFullName = sanitizeInput(invitationData.full_name || invitationData.email);
      const sanitizedPassword = password; // Don't sanitize password - preserve special chars

      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: sanitizedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: sanitizedFullName,
            invite_code: inviteCode,
            idempotency_key: idempotencyKey.current, // Phase 1: Send idempotency key
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Account Already Exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'destructive',
          });
        } else {
          throw signUpError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error('No user returned from signup');
      }

      // Phase 2: Remove arbitrary delay - verify profile exists instead
      // Poll for profile creation with timeout
      let profileExists = false;
      let attempts = 0;
      const maxAttempts = 10; // 5 seconds total (500ms * 10)
      
      while (!profileExists && attempts < maxAttempts) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle();
          
        if (profile) {
          profileExists = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }
      
      if (!profileExists) {
        throw new Error('Profile creation verification failed. Please contact support.');
      }

      const { error: teamMemberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitationData.team_id,
          user_id: authData.user.id,
          access_level: invitationData.role === 'admin' ? 'admin' : 'edit',
        });

      if (teamMemberError) throw teamMemberError;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          mobile_number: normalizedPhone.normalized,
          birthday: format(birthday, 'yyyy-MM-dd'),
          office_id: teamData.agency_id,
          primary_team_id: invitationData.team_id,
          fy_start_month: teamData.financial_year_start_month,
          uses_financial_year: teamData.uses_financial_year,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 6. Mark invitation as accepted
      await supabase
        .from('pending_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('token', inviteCode);

      // 7. Create default lists for the team if needed
      await supabase.rpc('create_default_lists_for_team', {
        p_team_id: invitationData.team_id,
        p_user_id: authData.user.id,
      });

      toast({
        title: 'Welcome! 🎉',
        description: `Joining ${teamData.name}...`,
      });

      // Redirect to dashboard immediately (auto-friend trigger handles teammate connections)
      navigate('/');
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Phase 5: Enhanced error handling with specific error codes
      let errorTitle = 'Signup Failed';
      let errorDescription = error.message || 'Unable to create account. Please try again.';
      
      if (error.code === 'idempotency_conflict') {
        errorTitle = 'Duplicate Submission';
        errorDescription = 'This invitation has already been processed. Redirecting...';
        setTimeout(() => navigate('/'), 2000);
      } else if (error.code === 'user_exists') {
        errorDescription = 'An account with this email already exists. Please sign in instead.';
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setSigningUp(false);
      isSubmitting.current = false; // Phase 1: Reset submission flag
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationData || !teamData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            Join <span className="font-semibold text-foreground">{teamData.name}</span> on AgentBuddy
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Team Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Office:</span>
              <span className="font-medium">{teamData.agency.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="secondary" className="capitalize">
                {invitationData.role}
              </Badge>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email - Pre-filled, disabled */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitationData.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Full Name - Pre-filled, disabled */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={invitationData.full_name || invitationData.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+64 27 123 4567"
                  required
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">We'll use this to contact you</p>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <DateSpinner value={birthday} onChange={setBirthday} />
              <p className="text-xs text-muted-foreground">For birthday celebrations! 🎂</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Create Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={signingUp}
            >
              {signingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Accept Invitation & Join'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to join {teamData.name} and inherit their team settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

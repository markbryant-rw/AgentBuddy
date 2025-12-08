import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AnimatedAuthBackground } from '@/components/AnimatedAuthBackground';
import { AgencyCombobox } from '@/components/AgencyCombobox';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { InvitationSignup } from '@/components/InvitationSignup';
import { TrendingUp, Check, X, Users, Loader2 } from 'lucide-react';
import { useAgencies } from '@/hooks/useAgencies';
import { cn } from '@/lib/utils';
import { authSchemas } from '@/lib/validation';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Check for invitation code - if present, render dedicated invitation flow
  const inviteCode = searchParams.get('invite_code');
  if (inviteCode) {
    return <InvitationSignup inviteCode={inviteCode} />;
  }
  
  const [loading, setLoading] = useState(false);
  const { agencies, loading: agenciesLoading } = useAgencies();
  
  const selectedPlan = searchParams.get('plan') as 'solo' | 'team' | null;
  const selectedBilling = searchParams.get('billing') as 'monthly' | 'annual' | null;
  const defaultTab = searchParams.get('tab') || 'signin';
  
  // Multi-step signup state
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  // Form data
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayVisibility, setBirthdayVisibility] = useState<'team_only' | 'friends_only' | 'public' | 'private'>('team_only');
  const [inviteData, setInviteData] = useState<{ email: string; role: string; team_id: string } | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  
  // NEW: User-first team status
  const [userStatus, setUserStatus] = useState<'solo_agent' | 'creating_team' | 'joining_team'>('solo_agent');
  const [teamName, setTeamName] = useState('');
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string }>>([]);
  
  // Financial year settings
  const [yearType, setYearType] = useState<'calendar' | 'financial'>('calendar');
  const [fyStartMonth, setFyStartMonth] = useState(7);
  
  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Handle invite code from URL
  useEffect(() => {
    const urlInviteCode = searchParams.get('invite_code');
    if (urlInviteCode) {
      setTeamCodeInput(urlInviteCode);
      fetchInvitation(urlInviteCode);
    }
  }, [searchParams]);

  // Set default team name when fullName changes
  useEffect(() => {
    if (fullName && !teamName && userStatus === 'creating_team') {
      setTeamName(fullName + "'s Team");
    }
  }, [fullName, userStatus]);

  const fetchInvitation = async (code: string) => {
    const { data, error } = await (supabase as any)
      .from('pending_invitations')
      .select('email, role, team_id, full_name')
      .eq('invite_code', code)
      .single();

    if (error) {
      console.error('Error fetching invitation:', error);
      toast({
        title: 'Invalid Invitation',
        description: 'This invitation link is invalid or has expired.',
        variant: 'destructive',
      });
      return;
    }

    if (!data) {
      console.error('Invitation not found');
      toast({
        title: 'Invalid Invitation',
        description: 'This invitation link could not be found.',
        variant: 'destructive',
      });
      return;
    }

    const invitation = data;
    setInviteData({ email: invitation.email, role: invitation.role || 'member', team_id: invitation.team_id });
    setSignUpEmail(invitation.email);
    setUserStatus('joining_team');

    // Pre-fill full name if provided
    if (invitation.full_name) {
      setFullName(invitation.full_name);
    }

    // Fetch team data to pre-populate settings
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('agency_id, uses_financial_year, financial_year_start_month')
      .eq('id', invitation.team_id)
      .single();

    if (teamError) {
      console.error('Error fetching team data:', teamError);
      // Continue anyway - team data is optional for pre-population
    }

    if (teamData) {
        // Pre-populate office
        if (teamData.agency_id) {
          setSelectedAgencyId(teamData.agency_id);
        }
        
        // Pre-populate financial year settings
        if (teamData.uses_financial_year) {
          setYearType('financial');
          setFyStartMonth(teamData.financial_year_start_month || 7);
        } else {
          setYearType('calendar');
        }
      }

    // Start at step 1 with simplified flow
    setCurrentStep(1);
  };

  const goToStep = (step: number, dir: number) => {
    setDirection(dir);
    setCurrentStep(step);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Step 1: Basic Info validation using Zod
      const emailResult = authSchemas.email.safeParse(signUpEmail);
      if (!emailResult.success) {
        toast({
          title: 'Invalid Email',
          description: emailResult.error.errors?.[0]?.message || 'Invalid email format',
          variant: 'destructive',
        });
        return;
      }

      const nameResult = authSchemas.fullName.safeParse(fullName);
      if (!nameResult.success) {
        toast({
          title: 'Invalid Name',
          description: nameResult.error.errors?.[0]?.message || 'Invalid name format',
          variant: 'destructive',
        });
        return;
      }

      const passwordResult = authSchemas.password.safeParse(signUpPassword);
      if (!passwordResult.success) {
        toast({
          title: 'Invalid Password',
          description: passwordResult.error.errors?.[0]?.message || 'Invalid password format',
          variant: 'destructive',
        });
        return;
      }

      // Validate birthday if provided
      if (birthday) {
        const birthdayResult = authSchemas.birthday.safeParse(birthday);
        if (!birthdayResult.success) {
          toast({
            title: 'Invalid Birthday',
            description: birthdayResult.error.errors?.[0]?.message || 'Invalid birthday format',
            variant: 'destructive',
          });
          return;
        }
      }
      
      goToStep(2, 1);
    } else if (currentStep === 2) {
      // Step 2: Locate Office (can skip)
      goToStep(3, 1);
    } else if (currentStep === 3) {
      // Step 3: Team Status
      if (userStatus === 'joining_team') {
        const teamCodeResult = authSchemas.teamCode.safeParse(teamCodeInput.trim().toUpperCase());
        if (!teamCodeResult.success) {
          toast({
            title: 'Invalid Team Code',
            description: teamCodeResult.error.errors?.[0]?.message || 'Invalid team code format',
            variant: 'destructive',
          });
          return;
        }
      }

      if (userStatus === 'creating_team') {
        const teamNameResult = authSchemas.teamName.safeParse(teamName);
        if (!teamNameResult.success) {
          toast({
            title: 'Invalid Team Name',
            description: teamNameResult.error.errors?.[0]?.message || 'Invalid team name format',
            variant: 'destructive',
          });
          return;
        }
      }

      // If creating team, go to team members (step 4), otherwise skip to quarterly (step 5)
      if (userStatus === 'creating_team') {
        goToStep(4, 1);
      } else {
        goToStep(5, 1);
      }
    } else if (currentStep === 4) {
      // Step 4: Team Members (only for creating_team)
      goToStep(5, 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 2) {
      // Skip office selection
      setSelectedAgencyId(null);
      goToStep(3, 1);
    } else if (currentStep === 4) {
      // Skip team members
      setTeamMembers([]);
      goToStep(5, 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      goToStep(1, -1);
    } else if (currentStep === 3) {
      goToStep(2, -1);
    } else if (currentStep === 4) {
      goToStep(3, -1);
    } else if (currentStep === 5) {
      // If came from invite or solo/joining, go back to step 3
      // If creating team, go back to step 4
      if (userStatus === 'creating_team') {
        goToStep(4, -1);
      } else {
        goToStep(3, -1);
      }
    }
  };

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { name: '', email: '' }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const updateTeamMember = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...teamMembers];
    updated[index][field] = value;
    setTeamMembers(updated);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usesFinancialYear = yearType === 'financial';
      
      const metadata: any = {
        full_name: fullName,
        user_status: userStatus,
        uses_financial_year: usesFinancialYear,
        fy_start_month: usesFinancialYear ? fyStartMonth : null,
      };

      // Add birthday if provided
      if (birthday) {
        metadata.birthday = birthday;
        metadata.birthday_visibility = birthdayVisibility;
      }

      // Add team_name only if creating a team
      if (userStatus === 'creating_team') {
        metadata.team_name = teamName || fullName + "'s Team";
      }

      // Add team_join_code only if joining a team
      if (userStatus === 'joining_team' && teamCodeInput.trim()) {
        metadata.team_join_code = teamCodeInput.trim();
      }

      // Add requested office if selected
      if (selectedAgencyId) {
        metadata.requested_agency_id = selectedAgencyId;
      }

      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata,
        },
      });

      if (error) {
        console.error('Signup error details:', error);
        toast({
          title: 'Sign Up Failed',
          description: getAuthErrorMessage(error),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      } else {
        // Mark invitation as accepted if joining via invite
        if (inviteData && searchParams.get('invite_code')) {
          await (supabase as any)
            .from('pending_invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('invite_code', searchParams.get('invite_code'));
        }

        // Send team member invitations if creating team and has members
        if (userStatus === 'creating_team' && teamMembers.length > 0 && data.user) {
          const validMembers = teamMembers.filter(m => 
            m.email.trim() && m.name.trim()
          );
          
          for (const member of validMembers) {
            try {
              await supabase.functions.invoke('send-team-invite', {
                body: { email: member.email, role: 'member' },
              });
            } catch (inviteError) {
              console.error('Failed to send invitation:', inviteError);
            }
          }
        }

        const selectedAgency = agencies.find(a => a.id === selectedAgencyId);
        
        let successMessage = 'Welcome! Your account is ready.';
        if (userStatus === 'solo_agent') {
          successMessage = 'Welcome! You can create or join a team later in Settings.';
        } else if (userStatus === 'joining_team') {
          successMessage = 'Welcome! You have joined the team.';
        } else if (userStatus === 'creating_team') {
          successMessage = 'Welcome! Your team has been created.';
        }
        
        if (selectedAgencyId) {
          successMessage += ` Your request to join ${selectedAgency?.name} is pending approval.`;
        }
        
        toast({
          title: 'Success!',
          description: successMessage,
        });

        // If user selected a plan from landing page, redirect to billing
        if (selectedPlan) {
          localStorage.setItem('pending_plan', selectedPlan);
          if (selectedBilling) {
            localStorage.setItem('pending_billing', selectedBilling);
          }
          navigate('/setup?tab=billing&auto_checkout=true');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const getAuthErrorMessage = (error: any): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid login credentials')) {
      return 'Email or password is incorrect. Please try again or reset your password.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please confirm your email address. Check your inbox for the confirmation link.';
    }
    if (message.includes('user already registered')) {
      return 'This email is already registered. Try signing in instead.';
    }
    if (message.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    return error.message;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate email
    const emailResult = authSchemas.email.safeParse(signInEmail);
    if (!emailResult.success) {
      toast({
        title: 'Invalid Email',
        description: emailResult.error.errors?.[0]?.message || 'Invalid email format',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailResult.data,
      password: signInPassword,
    });

    if (error) {
      toast({
        title: 'Sign In Failed',
        description: getAuthErrorMessage(error),
        variant: 'destructive',
      });
      setLoading(false);
    } else if (data.user) {
      toast({
        title: "Welcome back!",
        description: `Signed in successfully`,
      });
      // Don't navigate - let AuthGuard handle the redirect automatically
    }

    setLoading(false);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  };

  // Calculate total steps based on user flow
  const totalSteps = userStatus === 'creating_team' ? 5 : 4;
  const stepNumbers = userStatus === 'creating_team' ? [1, 2, 3, 4, 5] : [1, 2, 3, 5];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 relative overflow-hidden">
      <AnimatedAuthBackground />
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">AgentBuddy</CardTitle>
          <CardDescription>Your AI teammate for real estate success</CardDescription>
          {inviteData && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">You've been invited to join as:</p>
              <Badge variant="secondary" className="mt-2">
                {inviteData.role === 'admin' ? '👑 Admin' : '👤 Team Member'}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Invitation-only notice */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Invitation-Only Access</h3>
                  <p className="text-sm text-muted-foreground">
                    AgentBuddy is available by invitation only. If you've received an invitation link, 
                    please use that to create your account. Otherwise, contact your administrator for access.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
      
      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword}
      />
    </div>
  );
};

export default Auth;

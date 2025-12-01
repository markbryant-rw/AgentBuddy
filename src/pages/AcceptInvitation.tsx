import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateSpinner } from '@/components/ui/date-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, UserCheck, AlertCircle, Eye, EyeOff, Phone } from 'lucide-react';
import { RoleBadge } from '@/components/RoleBadge';
import { passwordSchema, fullNameSchema } from '@/lib/validation';
import { normalizeNZMobile } from '@/lib/phoneUtils';
import type { AppRole } from '@/lib/rbac';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface InvitationData {
  id: string;
  email: string;
  role: AppRole;
  full_name: string | null;
  team_id: string | null;
  office_id: string | null;
  invited_by: string;
  expires_at: string;
  inviter: {
    full_name: string | null;
    email: string;
  };
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthday, setBirthday] = useState<Date>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [birthdayError, setBirthdayError] = useState('');

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call backend function to get invitation details (bypasses RLS)
      const { data, error: fetchError } = await supabase.functions.invoke('get-invitation-details', {
        body: { token },
      });

      if (fetchError || data?.error) {
        setError(data?.error || 'Invalid invitation link');
        return;
      }

      setInvitation(data as InvitationData);
      
      if (data.full_name) {
        setFullName(data.full_name);
      }
    } catch (error) {
      logger.error('Error validating invitation', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate full name
    try {
      fullNameSchema.parse(fullName);
      setNameError('');
    } catch (error: any) {
      setNameError(error.errors[0]?.message || 'Invalid name');
      isValid = false;
    }

    // Validate mobile number
    const phoneValidation = normalizeNZMobile(mobileNumber);
    if (!mobileNumber) {
      setMobileError('Mobile number is required');
      isValid = false;
    } else if (!phoneValidation.isValid) {
      setMobileError(phoneValidation.error || 'Invalid mobile number');
      isValid = false;
    } else {
      setMobileError('');
    }

    // Validate birthday (must be 18+)
    if (!birthday) {
      setBirthdayError('Date of birth is required');
      isValid = false;
    } else {
      const age = new Date().getFullYear() - birthday.getFullYear();
      if (age < 18) {
        setBirthdayError('You must be at least 18 years old');
        isValid = false;
      } else {
        setBirthdayError('');
      }
    }

    // Validate password
    try {
      passwordSchema.parse(password);
      setPasswordError('');
    } catch (error: any) {
      setPasswordError(error.errors[0]?.message || 'Invalid password');
      isValid = false;
    }

    // Check password match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !invitation) {
      return;
    }

    setSubmitting(true);

    try {
      const normalizedPhone = normalizeNZMobile(mobileNumber);
      
      // Call backend function to handle the entire invitation acceptance
      const { data, error: functionError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          token,
          fullName,
          mobileNumber: normalizedPhone.normalized,
          birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
          password,
        },
      });

      // CRITICAL: Log all response details for debugging
      console.log('accept-invitation response:', { data, functionError });

      // Check if the function call itself failed (network/auth/404 errors)
      if (functionError) {
        console.error('Function invocation error:', functionError);
        
        // Surface the actual error to the user
        const errorMsg = functionError.message || 'The invitation service is temporarily unavailable';
        toast.error(`Error: ${errorMsg}. Please contact your office manager.`);
        return;
      }

      // Check if the function returned an error response
      if (!data?.success) {
        // Handle specific error codes with user-friendly messages
        const errorCode = data?.code;
        const errorMessage = data?.message;

        console.error('Backend error:', { errorCode, errorMessage });

        switch (errorCode) {
          case 'user_exists':
            toast.error('This email already has an account. Please sign in or ask your office manager to transfer/reactivate it.');
            break;
          case 'invalid_token':
          case 'expired':
          case 'already_used':
            setError(errorMessage || 'This invitation is no longer valid');
            break;
          case 'missing_fields':
            toast.error('Please fill in all required fields');
            break;
          default:
            toast.error(errorMessage || 'Failed to accept invitation. Please try again.');
        }
        return;
      }

      // Success! Now sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: password,
      });

      if (signInError) {
        console.error('Sign in error after account creation:', signInError);
        toast.error('Your account was created, but automatic sign-in failed. Please try signing in manually.');
        navigate('/auth');
        return;
      }

      toast.success('Welcome to AgentBuddy! 🎉');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error('An unexpected error occurred. Please try again or contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-lg border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription className="text-destructive/80">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const inviterName = invitation?.inviter?.full_name || invitation?.inviter?.email || 'Your office';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-8 rounded-t-lg text-center">
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">🎉 Welcome to AgentBuddy!</h1>
          <p className="text-primary-foreground/90">Your AI-powered real estate hub</p>
        </div>

        <CardHeader className="space-y-4 pt-6">
          {/* Invitation Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invited by</span>
              <span className="font-medium">{inviterName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <RoleBadge role={invitation?.role} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            {/* Email (disabled) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                disabled={submitting}
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
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
                  disabled={submitting}
                  className={cn("pl-9", mobileError ? 'border-destructive' : '')}
                />
              </div>
              <p className="text-xs text-muted-foreground">We'll use this to contact you</p>
              {mobileError && <p className="text-sm text-destructive">{mobileError}</p>}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <DateSpinner value={birthday} onChange={setBirthday} />
              <p className="text-xs text-muted-foreground">For birthday celebrations! 🎂</p>
              {birthdayError && <p className="text-sm text-destructive">{birthdayError}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  className={cn("pr-10", passwordError ? 'border-destructive' : '')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={submitting}
                  className={cn("pr-10", passwordError ? 'border-destructive' : '')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg h-12 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-5 w-5" />
                  Accept Invitation & Join
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

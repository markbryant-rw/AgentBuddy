import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateSpinner } from '@/components/ui/date-spinner';
import { Loader2, UserCheck, AlertCircle, Phone } from 'lucide-react';
import { RoleBadge } from '@/components/RoleBadge';
import { fullNameSchema } from '@/lib/validation';
import { normalizeNZMobile } from '@/lib/phoneUtils';
import type { AppRole } from '@/lib/rbac';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

/**
 * COMPLETE PROFILE - Magic Link Onboarding
 *
 * This page is shown after a user clicks their magic link invitation.
 * The user is already authenticated via Supabase Auth.
 *
 * Flow:
 * 1. User clicks magic link in email → Auto-authenticated by Supabase
 * 2. Redirected here with invitation metadata in user_metadata
 * 3. Fill out minimal profile info (name, mobile, DOB)
 * 4. Submit → Create profile, assign role, mark invitation accepted
 * 5. Redirect to dashboard
 */

interface InvitationMetadata {
  invitation_id: string;
  role: AppRole;
  office_id: string;
  office_name: string;
  team_id?: string;
  invited_by_name: string;
  full_name?: string;
}

export default function CompleteProfile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<InvitationMetadata | null>(null);

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthday, setBirthday] = useState<Date>();

  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [birthdayError, setBirthdayError] = useState('');

  useEffect(() => {
    checkInvitationMetadata();
  }, []);

  const checkInvitationMetadata = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('No active session found. Please check your invitation email and click the link again.');
        return;
      }

      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile?.onboarding_completed) {
        // Already onboarded - redirect to dashboard
        navigate('/dashboard');
        return;
      }

      // Extract invitation metadata from user_metadata
      const invitationMeta = user.user_metadata as InvitationMetadata;

      if (!invitationMeta?.invitation_id) {
        setError('Invalid invitation. Missing invitation metadata.');
        logger.error('Missing invitation_id in user_metadata', { user_metadata: user.user_metadata });
        return;
      }

      // Validate invitation still exists and is pending
      const { data: invitation, error: invitationError } = await supabase.functions.invoke(
        'get-invitation-details',
        {
          body: { invitation_id: invitationMeta.invitation_id },
        }
      );

      if (invitationError || invitation?.error) {
        setError(invitation?.error || 'Invitation not found or has been revoked');
        return;
      }

      setMetadata(invitationMeta);

      // Pre-fill name if provided
      if (invitationMeta.full_name) {
        setFullName(invitationMeta.full_name);
      }

    } catch (error) {
      logger.error('Error checking invitation metadata', error);
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
      const monthDiff = new Date().getMonth() - birthday.getMonth();
      const dayDiff = new Date().getDate() - birthday.getDate();

      // More accurate age calculation
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      if (actualAge < 18) {
        setBirthdayError('You must be at least 18 years old');
        isValid = false;
      } else {
        setBirthdayError('');
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !metadata) {
      return;
    }

    setSubmitting(true);

    try {
      const phoneValidation = normalizeNZMobile(mobileNumber);
      if (!phoneValidation.isValid) {
        toast.error('Invalid mobile number');
        return;
      }

      // Call the complete-profile Edge Function
      const { data, error } = await supabase.functions.invoke('complete-profile-magic', {
        body: {
          invitation_id: metadata.invitation_id,
          full_name: fullName,
          mobile_number: phoneValidation.normalized,
          birthday: format(birthday!, 'yyyy-MM-dd'),
        },
      });

      if (error || data?.error) {
        const errorMessage = data?.error || error?.message || 'Failed to complete profile';
        logger.error('Profile completion failed', { error, data });
        toast.error(errorMessage);
        return;
      }

      toast.success('Welcome to AgentBuddy!');

      // Redirect based on role
      const roleRedirects: Record<AppRole, string> = {
        platform_admin: '/platform-admin',
        office_manager: '/office-manager',
        team_leader: '/team-leader',
        salesperson: '/dashboard',
        assistant: '/dashboard',
      };

      const redirectPath = roleRedirects[metadata.role] || '/dashboard';
      navigate(redirectPath);

    } catch (error) {
      logger.error('Error completing profile', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <p className="text-sm text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            You've been invited by <strong>{metadata.invited_by_name}</strong> to join{' '}
            <strong>{metadata.office_name}</strong> as a{' '}
            <RoleBadge role={metadata.role} />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && <p className="text-sm text-red-500">{nameError}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="021 123 4567"
                  className={`pl-10 ${mobileError ? 'border-red-500' : ''}`}
                />
              </div>
              {mobileError && <p className="text-sm text-red-500">{mobileError}</p>}
              <p className="text-xs text-muted-foreground">
                NZ mobile numbers only (021, 022, 027, 028, 029)
              </p>
            </div>

            {/* Birthday */}
            <div className="space-y-2">
              <Label htmlFor="birthday">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <DateSpinner
                id="birthday"
                date={birthday}
                onDateChange={setBirthday}
                minYear={1924}
                maxYear={new Date().getFullYear() - 18}
              />
              {birthdayError && <p className="text-sm text-red-500">{birthdayError}</p>}
              <p className="text-xs text-muted-foreground">
                You must be at least 18 years old
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                'Complete Profile & Get Started'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to AgentBuddy's terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

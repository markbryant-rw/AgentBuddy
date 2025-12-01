import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Users } from 'lucide-react';

interface InvitationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warningType: 'already_invited' | 'user_exists' | 'user_inactive' | null;
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
  data?: any;
}

export function InvitationWarningDialog({
  open,
  onOpenChange,
  warningType,
  email,
  onConfirm,
  onCancel,
  data,
}: InvitationWarningDialogProps) {
  const getContent = () => {
    switch (warningType) {
      case 'already_invited':
        return {
          icon: <Mail className="h-5 w-5 text-warning" />,
          title: 'User Already Invited',
          description: (
            <>
              <div className="mb-2">
                <strong>{email}</strong> has already been sent an invitation that hasn't been accepted yet.
              </div>
              <div>Would you like to send them a reminder email instead?</div>
            </>
          ),
          confirmText: 'Send Reminder',
          cancelText: 'Cancel',
        };
      
      case 'user_exists':
        const isOrphaned = data?.profile?.is_orphaned;
        return {
          icon: <Users className="h-5 w-5 text-amber-500" />,
          title: isOrphaned ? 'Orphaned Account Detected' : 'User Already Exists',
          description: (
            <>
              {isOrphaned ? (
                <>
                  <div className="mb-2">
                    <strong>{email}</strong> exists but is not properly configured.
                  </div>
                  <div className="mb-4">
                    This user accepted an invitation previously but their account setup is incomplete. Click below to repair their account and set a temporary password.
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <strong>{email}</strong> already has an active account{data?.profile?.office_name ? ` in ${data.profile.office_name}` : ''}.
                  </div>
                  <div>This user cannot be invited again.</div>
                </>
              )}
            </>
          ),
          confirmText: isOrphaned ? 'Repair Account' : 'OK',
          cancelText: isOrphaned ? 'Cancel' : null,
        };
      
      case 'user_inactive':
        return {
          icon: <Users className="h-5 w-5 text-orange-500" />,
          title: 'Reactivate User',
          description: (
            <>
              <div className="mb-2">
                <strong>{email}</strong> was previously deactivated{data?.profile?.last_office ? ` from ${data.profile.last_office}` : ''}.
              </div>
              <div>Would you like to reactivate this user instead of creating a new invitation?</div>
            </>
          ),
          confirmText: 'Reactivate User',
          cancelText: 'Cancel',
        };
      
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {content.icon}
            <AlertDialogTitle>{content.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {content.cancelText && (
            <AlertDialogCancel onClick={onCancel}>
              {content.cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onConfirm}>
            {content.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

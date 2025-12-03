import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, Trash2, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingUserActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    roles: string[];
    invitationId?: string;
    invitedAt?: string;
  };
}

export const PendingUserActionsDialog = ({
  open,
  onOpenChange,
  user,
}: PendingUserActionsDialogProps) => {
  const [isResending, setIsResending] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const { resendInvitation, revokeInvitation } = useInvitations();
  const queryClient = useQueryClient();

  const handleResend = async () => {
    if (!user.invitationId) {
      toast.error('No invitation ID found');
      return;
    }
    
    setIsResending(true);
    try {
      await resendInvitation(user.invitationId);
      toast.success(`Reminder sent to ${user.email}`);
      queryClient.invalidateQueries({ queryKey: ['platform-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-expanded'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend invitation');
    } finally {
      setIsResending(false);
    }
  };

  const handleRevoke = async () => {
    if (!user.invitationId) {
      toast.error('No invitation ID found');
      return;
    }
    
    setIsRevoking(true);
    try {
      await revokeInvitation(user.invitationId);
      toast.success(`Invitation for ${user.email} has been revoked`);
      queryClient.invalidateQueries({ queryKey: ['platform-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-members-expanded'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke invitation');
    } finally {
      setIsRevoking(false);
      setShowRevokeConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning">
                Pending
              </Badge>
              {user.full_name}
            </DialogTitle>
            <DialogDescription>
              Manage this pending invitation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Info */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.email}</span>
              </div>
              {user.invitedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Invited {formatDistanceToNow(new Date(user.invitedAt), { addSuffix: true })}
                    {' · '}
                    {format(new Date(user.invitedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {user.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This user has been invited but hasn't completed their signup yet. 
                You can resend the invitation email or revoke it if needed.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button 
                variant="default" 
                onClick={handleResend}
                disabled={isResending}
                className="w-full justify-start"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Resend Invitation Email
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowRevokeConfirm(true)}
                disabled={isRevoking}
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                {isRevoking ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Revoke Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation for <strong>{user.email}</strong>. 
              They will no longer be able to sign up using the existing invitation link.
              You can always send a new invitation later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

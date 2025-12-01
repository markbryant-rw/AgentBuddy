import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useImpersonationAlert } from '@/hooks/useImpersonationAlert';

export const ImpersonationAlertBanner = () => {
  const { isBeingViewed, adminName, reason, startedAt } = useImpersonationAlert();

  if (!isBeingViewed) return null;

  return (
    <Alert className="fixed top-[60px] left-0 right-0 z-30 rounded-none border-x-0 bg-blue-500/95 text-white border-blue-400">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>
            🔍 Platform Admin <strong>{adminName}</strong> is currently viewing your account
            <span className="ml-2 text-blue-100">• Reason: {reason}</span>
          </span>
          <span className="text-sm text-blue-200">
            Started {formatDistanceToNow(new Date(startedAt))} ago
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
};

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckSquare, XSquare } from 'lucide-react';
import type { ParsedUser } from '@/hooks/useUserImport';
import { useBulkInvite } from '@/hooks/useBulkInvite';

interface BulkInviteControlsProps {
  users: ParsedUser[];
  stats: {
    total: number;
    valid: number;
    withWarnings: number;
    withErrors: number;
    selected: number;
  };
  onSelectAll: (validOnly: boolean) => void;
  onDeselectAll: () => void;
  onInvite: (users: ParsedUser[]) => Promise<void>;
  isInviting: boolean;
}

export function BulkInviteControls({
  users,
  stats,
  onSelectAll,
  onDeselectAll,
  onInvite,
}: BulkInviteControlsProps) {
  const { progress, isInviting } = useBulkInvite();
  const selectedUsers = users.filter(u => u.isSelected);
  const canInvite = selectedUsers.length > 0 && !isInviting;

  const progressPercentage = progress
    ? (progress.completed / progress.total) * 100
    : 0;

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Progress Bar */}
      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Inviting: {progress.currentEmail || 'Preparing...'}
            </span>
            <span className="font-medium">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <Progress value={progressPercentage} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>✓ {progress.successful} successful</span>
            <span>✗ {progress.failed} failed</span>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectAll(true)}
            disabled={isInviting}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Select Valid ({stats.valid})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeselectAll}
            disabled={isInviting}
          >
            <XSquare className="h-4 w-4 mr-2" />
            Deselect All
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onInvite(selectedUsers)}
            disabled={!canInvite}
            size="lg"
          >
            {isInviting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invite {stats.selected} User{stats.selected !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning about errors */}
      {stats.withErrors > 0 && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            {stats.withErrors} user{stats.withErrors !== 1 ? 's' : ''} cannot be invited due to validation errors.
            Fix the errors or remove these users before proceeding.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

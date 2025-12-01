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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle } from 'lucide-react';
import { DuplicateMatch } from '@/hooks/directory/useDuplicateDetection';

interface DuplicateWarningDialogProps {
  open: boolean;
  match: DuplicateMatch | null;
  onCancel: () => void;
  onProceed: () => void;
}

export const DuplicateWarningDialog = ({
  open,
  match,
  onCancel,
  onProceed,
}: DuplicateWarningDialogProps) => {
  if (!match) return null;

  const isExactMatch = match.matchType === 'exact';
  const isHighSimilarity = match.matchType === 'high';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-2xl z-[11001]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isExactMatch ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            )}
            <div>
              <AlertDialogTitle>
                {isExactMatch
                  ? 'Duplicate Provider Detected'
                  : 'Similar Provider Found'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {match.matchReason}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {match.provider.avatar_url && (
                <AvatarImage src={match.provider.avatar_url} />
              )}
              <AvatarFallback>
                {match.provider.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-lg">{match.provider.full_name}</h4>
                <Badge variant={isExactMatch ? 'destructive' : 'secondary'}>
                  {match.matchType.toUpperCase()}
                </Badge>
              </div>
              {match.provider.company_name && (
                <p className="text-sm text-muted-foreground">
                  {match.provider.company_name}
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm">
                {match.provider.phone && (
                  <p>📞 {match.provider.phone}</p>
                )}
                {match.provider.email && (
                  <p>✉️ {match.provider.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {isExactMatch ? 'Close' : 'Cancel'}
          </AlertDialogCancel>
          {!isExactMatch && (
            <AlertDialogAction onClick={onProceed} className="bg-orange-600 hover:bg-orange-700">
              {isHighSimilarity
                ? 'Add Anyway (Flag for Review)'
                : 'Add Anyway'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

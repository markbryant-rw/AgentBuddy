import { addDays, format } from 'date-fns';
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

interface RollForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uncompletedCount: number;
  currentDate: Date;
  onConfirm: () => void;
}

export function RollForwardDialog({
  open,
  onOpenChange,
  uncompletedCount,
  currentDate,
  onConfirm,
}: RollForwardDialogProps) {
  const nextDay = addDays(currentDate, 1);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Roll Forward Uncompleted Tasks</AlertDialogTitle>
          <AlertDialogDescription>
            Move {uncompletedCount} uncompleted task{uncompletedCount !== 1 ? 's' : ''} to{' '}
            <strong>{format(nextDay, 'EEEE, MMM d, yyyy')}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Move Tasks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface DeleteUserDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteUserDialog = ({ user, open, onOpenChange }: DeleteUserDialogProps) => {
  const { deleteUser } = useAdminUsers();
  const [hardDelete, setHardDelete] = React.useState(false);

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync({ targetUserId: user.id, hardDelete });
      onOpenChange(false);
    } catch (error) {
      // Error is already handled by the mutation
      console.error('Delete failed:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {user.full_name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-start space-x-2 rounded-md border border-border/50 p-4">
          <Checkbox 
            id="hard-delete" 
            checked={hardDelete}
            onCheckedChange={(checked) => setHardDelete(checked === true)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="hard-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Permanent deletion
            </Label>
            <p className="text-sm text-muted-foreground">
              {hardDelete 
                ? 'This will PERMANENTLY delete the user and all their data. The email can be reused immediately.' 
                : 'This will soft-delete (archive) the user. Their data will be preserved.'}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteUser.isPending}
          >
            {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hardDelete ? 'Delete Permanently' : 'Delete User'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

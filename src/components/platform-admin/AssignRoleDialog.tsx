import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/lib/rbac';
import { Loader2 } from 'lucide-react';

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string;
}

export function AssignRoleDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
}: AssignRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch all offices
  const { data: offices = [] } = useQuery({
    queryKey: ['all-offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-role-to-user`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target_user_id: userId,
            role: selectedRole,
            office_id: selectedOffice || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-without-roles'] });
      queryClient.invalidateQueries({ queryKey: ['system-health'] });
      toast.success('Role assigned successfully', {
        description: `${userName} is now a ${selectedRole.replace('_', ' ')}`,
      });
      onOpenChange(false);
      setSelectedRole('');
      setSelectedOffice('');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign role', {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }
    assignRoleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role to User</DialogTitle>
          <DialogDescription>
            Assign a system role to {userName} ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_admin">Platform Admin</SelectItem>
                <SelectItem value="office_manager">Office Manager</SelectItem>
                <SelectItem value="team_leader">Team Leader</SelectItem>
                <SelectItem value="salesperson">Salesperson</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="office">Office (Optional)</Label>
            <Select value={selectedOffice} onValueChange={setSelectedOffice}>
              <SelectTrigger id="office">
                <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Office</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignRoleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || assignRoleMutation.isPending}
          >
            {assignRoleMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

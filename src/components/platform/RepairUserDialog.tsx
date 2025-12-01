import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wrench, AlertTriangle, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface RepairUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    office_id: string | null;
    primary_team_id: string | null;
  } | null;
}

export const RepairUserDialog = ({
  open,
  onOpenChange,
  user,
}: RepairUserDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'salesperson' | 'assistant' | 'team_leader' | 'office_manager'>('salesperson');
  const [resetPassword, setResetPassword] = useState(true);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isSoloAgent, setIsSoloAgent] = useState(false);

  // Fetch offices
  const { data: offices = [] } = useQuery({
    queryKey: ['platform-admin-offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch teams for selected office
  const { data: teams = [] } = useQuery({
    queryKey: ['office-teams', selectedOffice],
    queryFn: async () => {
      if (!selectedOffice) return [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, is_personal_team')
        .eq('agency_id', selectedOffice)
        .eq('is_personal_team', false)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedOffice,
  });

  // Set initial values from user data
  useEffect(() => {
    if (user) {
      if (user.office_id) setSelectedOffice(user.office_id);
      if (user.primary_team_id) setSelectedTeam(user.primary_team_id);
    }
  }, [user]);

  // Repair user mutation
  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedOffice || (!isSoloAgent && !selectedTeam)) {
        throw new Error('Missing required fields');
      }

      const { data, error } = await supabase.functions.invoke('repair-user', {
        body: {
          userId: user.id,
          officeId: selectedOffice,
          teamId: isSoloAgent ? null : selectedTeam,
          role: selectedRole,
          resetPassword,
          isSoloAgent,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.temporaryPassword) {
        setTemporaryPassword(data.temporaryPassword);
        toast.success('User repaired successfully!', {
          description: 'Temporary password generated. Copy it before closing.',
        });
      } else {
        toast.success('User repaired successfully!');
        onOpenChange(false);
      }
      
      queryClient.invalidateQueries({ queryKey: ['platform-admin-users'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to repair user', {
        description: error.message,
      });
    },
  });

  const handleRepair = () => {
    repairMutation.mutate();
  };

  const handleCopyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopiedPassword(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleClose = () => {
    setTemporaryPassword(null);
    setCopiedPassword(false);
    onOpenChange(false);
  };

  if (!user) return null;

  const isOrphaned = !user.office_id || !user.primary_team_id;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            <DialogTitle>Repair User Account</DialogTitle>
          </div>
          <DialogDescription>
            Fix orphaned or incomplete user account: {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {temporaryPassword ? (
          // Success state with temporary password
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                User account has been successfully repaired!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <Label className="text-sm font-semibold">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-background rounded border font-mono text-sm">
                  {temporaryPassword}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPassword}
                >
                  {copiedPassword ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this password with {user.full_name || 'the user'}. They can log in with their email and this password, then change it.
              </p>
            </div>
          </div>
        ) : (
          // Repair form
          <div className="space-y-4">
            {isOrphaned && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Orphaned User Detected:</strong> This user is missing critical information
                  {!user.office_id && ' (no office)'}
                  {!user.primary_team_id && ' (no primary team)'}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="office">Office *</Label>
                <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                  <SelectTrigger id="office">
                    <SelectValue placeholder="Select office..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Team Assignment *</Label>
                <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="designated-team"
                      checked={!isSoloAgent}
                      onChange={() => setIsSoloAgent(false)}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="designated-team" className="cursor-pointer font-normal">Assign to Team</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="solo-agent"
                      checked={isSoloAgent}
                      onChange={() => {
                        setIsSoloAgent(true);
                        setSelectedTeam('');
                      }}
                      className="cursor-pointer"
                    />
                    <Label htmlFor="solo-agent" className="cursor-pointer font-normal">Solo Agent (Personal Team)</Label>
                  </div>
                </div>

                {!isSoloAgent && (
                  <Select
                    value={selectedTeam}
                    onValueChange={setSelectedTeam}
                    disabled={!selectedOffice || teams.length === 0}
                  >
                    <SelectTrigger id="team">
                      <SelectValue placeholder={
                        !selectedOffice ? "Select office first..." : 
                        teams.length === 0 ? "No teams available" :
                        "Select team..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {isSoloAgent && (
                  <p className="text-sm text-muted-foreground">
                    A personal team will be created for this user
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salesperson">Salesperson</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="team_leader">Team Leader</SelectItem>
                    <SelectItem value="office_manager">Office Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="reset-password" className="text-sm font-medium">
                    Generate Temporary Password
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Create a new password for the user to log in with
                  </p>
                </div>
                <Switch
                  id="reset-password"
                  checked={resetPassword}
                  onCheckedChange={setResetPassword}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {temporaryPassword ? 'Close' : 'Cancel'}
          </Button>
          {!temporaryPassword && (
            <Button
              onClick={handleRepair}
              disabled={!selectedOffice || (!isSoloAgent && !selectedTeam) || repairMutation.isPending}
            >
              {repairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Repair User Account
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

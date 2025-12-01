import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Loader2,
  ListTodo,
  Home,
  TrendingUp,
  MessageSquare,
  FileText,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SmartDeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  onConfirm: () => void;
}

interface UserDataImpact {
  teams: Array<{ id: string; name: string }>;
  tasks: number;
  listings: number;
  appraisals: number;
  conversations: number;
  notes: number;
}

const DataImpactItem = ({
  icon,
  label,
  total,
  severity,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  severity: 'info' | 'warning' | 'critical';
}) => {
  const severityColors = {
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950',
    warning: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950',
    critical: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950',
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${severityColors[severity]}`}>
      <div className="flex items-center gap-3">
        <div className="opacity-70">{icon}</div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <Badge variant={total > 0 ? 'default' : 'secondary'}>
        {total} total
      </Badge>
    </div>
  );
};

export const SmartDeleteUserDialog = ({
  open,
  onOpenChange,
  user,
  onConfirm,
}: SmartDeleteUserDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch user data impact across ALL teams
  const { data: impact, isLoading: isLoadingImpact } = useQuery({
    queryKey: ['user-deletion-impact', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch teams
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams:team_id (
            name
          )
        `)
        .eq('user_id', user.id);

      const teams = teamMemberships?.map(tm => ({
        id: tm.team_id,
        name: (tm.teams as any)?.name || 'Unknown',
      })) || [];

      // Fetch tasks across all teams
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('assigned_to', user.id);

      // Fetch listings across all teams
      const { data: listings } = await supabase
        .from('transactions')
        .select('id')
        .or(`assignees->lead_salesperson.eq.${user.id},assignees->secondary_salesperson.eq.${user.id}`);

      // Fetch appraisals
      const { data: appraisals } = await supabase
        .from('logged_appraisals')
        .select('id')
        .eq('created_by', user.id);

      // Fetch conversation participations
      const { data: conversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      // Fetch notes
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      return {
        teams,
        tasks: tasks?.length || 0,
        listings: listings?.length || 0,
        appraisals: appraisals?.length || 0,
        conversations: conversations?.length || 0,
        notes: notesCount || 0,
      } as UserDataImpact;
    },
    enabled: open && !!user,
  });

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Deletion failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete User - Data Impact Warning</DialogTitle>
          <DialogDescription>
            Deleting {user.full_name} will permanently remove all their data
          </DialogDescription>
        </DialogHeader>

        {isLoadingImpact ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>WARNING:</strong> This action cannot be undone. All data belonging to{' '}
                <strong>{user.full_name}</strong> will be permanently deleted.
              </AlertDescription>
            </Alert>

            {impact && impact.teams.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="font-semibold text-sm">Team Memberships</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Member of {impact.teams.length} team{impact.teams.length === 1 ? '' : 's'}:{' '}
                  {impact.teams.map(t => t.name).join(', ')}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Data That Will Be Deleted:</h4>

              <DataImpactItem
                icon={<ListTodo className="h-4 w-4" />}
                label="Tasks"
                total={impact?.tasks || 0}
                severity={impact && impact.tasks > 0 ? 'critical' : 'info'}
              />

              <DataImpactItem
                icon={<Home className="h-4 w-4" />}
                label="Listings"
                total={impact?.listings || 0}
                severity={impact && impact.listings > 0 ? 'critical' : 'info'}
              />

              <DataImpactItem
                icon={<TrendingUp className="h-4 w-4" />}
                label="Appraisals"
                total={impact?.appraisals || 0}
                severity={impact && impact.appraisals > 0 ? 'warning' : 'info'}
              />

              <DataImpactItem
                icon={<MessageSquare className="h-4 w-4" />}
                label="Conversation Participations"
                total={impact?.conversations || 0}
                severity="info"
              />

              <DataImpactItem
                icon={<FileText className="h-4 w-4" />}
                label="Notes"
                total={impact?.notes || 0}
                severity={impact && impact.notes > 0 ? 'warning' : 'info'}
              />
            </div>

            {impact && (impact.tasks > 0 || impact.listings > 0 || impact.appraisals > 0) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Data Warning:</strong> This user has active tasks, listings, or
                  appraisals. Consider reassigning these before deletion, or use "Remove from Team"
                  instead to preserve their data.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing || isLoadingImpact}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete User Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Edit, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { MemberGoal, TeamMember } from '@/hooks/useTeamGoals';

interface TeamMemberTargetsTableProps {
  members: TeamMember[];
  memberGoals: MemberGoal[];
  onUpdateMemberGoal: (userId: string, kpiType: string, value: number, notes?: string) => Promise<void>;
  onToggleContribution: (teamMemberId: string, contributes: boolean) => Promise<void>;
}

interface EditDialogState {
  open: boolean;
  userId: string;
  userName: string;
  kpiType: string;
  currentValue: number;
  adminNotes: string;
}

export const TeamMemberTargetsTable = ({
  members,
  memberGoals,
  onUpdateMemberGoal,
  onToggleContribution,
}: TeamMemberTargetsTableProps) => {
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    userId: '',
    userName: '',
    kpiType: '',
    currentValue: 0,
    adminNotes: '',
  });
  const [saving, setSaving] = useState(false);

  const kpiTypes = ['calls', 'sms', 'appraisals', 'open_homes', 'listings', 'sales'];

  const getGoalValue = (userId: string, kpiType: string) => {
    const goal = memberGoals.find(g => g.user_id === userId && g.kpi_type === kpiType);
    return goal?.target_value || 0;
  };

  const isSetByAdmin = (userId: string, kpiType: string) => {
    const goal = memberGoals.find(g => g.user_id === userId && g.kpi_type === kpiType);
    return goal?.set_by_admin || false;
  };

  const handleEdit = (userId: string, userName: string, kpiType: string) => {
    const currentValue = getGoalValue(userId, kpiType);
    const goal = memberGoals.find(g => g.user_id === userId && g.kpi_type === kpiType);
    setEditDialog({
      open: true,
      userId,
      userName,
      kpiType,
      currentValue,
      adminNotes: goal?.admin_notes || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateMemberGoal(
        editDialog.userId,
        editDialog.kpiType,
        editDialog.currentValue,
        editDialog.adminNotes
      );
      setEditDialog({ ...editDialog, open: false });
    } finally {
      setSaving(false);
    }
  };

  const formatKpiLabel = (kpi: string) => {
    return kpi.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            {kpiTypes.map(kpi => (
              <TableHead key={kpi} className="text-center">
                {formatKpiLabel(kpi)}
              </TableHead>
            ))}
            <TableHead className="text-center">Contributing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(member => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.full_name}</TableCell>
              {kpiTypes.map(kpi => {
                const value = getGoalValue(member.user_id, kpi);
                const adminSet = isSetByAdmin(member.user_id, kpi);
                return (
                  <TableCell key={kpi} className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={adminSet ? 'text-yellow-500' : ''}>
                        {value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(member.user_id, member.full_name || 'Unknown', kpi)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="text-center">
                <div className="flex items-center justify-center">
                  <Switch
                    checked={member.contributes_to_kpis}
                    onCheckedChange={(checked) => onToggleContribution(member.id, checked)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Target for {editDialog.userName}</DialogTitle>
            <DialogDescription>
              Adjust {formatKpiLabel(editDialog.kpiType)} target and add optional notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="target-value">Target Value</Label>
              <Input
                id="target-value"
                type="number"
                min="0"
                value={editDialog.currentValue}
                onChange={(e) =>
                  setEditDialog({ ...editDialog, currentValue: Math.max(0, parseInt(e.target.value) || 0) })
                }
              />
            </div>
            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="e.g., On vacation, temporary adjustment..."
                value={editDialog.adminNotes}
                onChange={(e) => setEditDialog({ ...editDialog, adminNotes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ ...editDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

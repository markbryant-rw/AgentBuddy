import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTeamCRUD } from '@/hooks/useTeamCRUD';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
    bio?: string | null;
    uses_financial_year?: boolean;
    financial_year_start_month?: number;
  } | null;
}

export const EditTeamDialog = ({ open, onOpenChange, team }: EditTeamDialogProps) => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [usesFinancialYear, setUsesFinancialYear] = useState(false);
  const [fyStartMonth, setFyStartMonth] = useState(7);
  
  const { updateTeam, archiveTeam } = useTeamCRUD();

  useEffect(() => {
    if (team) {
      setName(team.name);
      setBio(team.bio || '');
      setUsesFinancialYear(team.uses_financial_year || false);
      setFyStartMonth(team.financial_year_start_month || 7);
    }
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!team) return;

    await updateTeam.mutateAsync({
      id: team.id,
      name,
      bio: bio || undefined,
      uses_financial_year: usesFinancialYear,
      financial_year_start_month: fyStartMonth,
    });

    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (!team) return;
    
    if (confirm('Are you sure you want to archive this team? Members will remain but the team will be hidden.')) {
      await archiveTeam.mutateAsync(team.id);
      onOpenChange(false);
    }
  };

  if (!team) return null;

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="bio">Description</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="usesFinancialYear"
                checked={usesFinancialYear}
                onCheckedChange={(checked) => setUsesFinancialYear(checked as boolean)}
              />
              <Label htmlFor="usesFinancialYear" className="text-sm font-normal">
                Use Financial Year
              </Label>
            </div>

            {usesFinancialYear && (
              <div>
                <Label htmlFor="fyStartMonth">Financial Year Start Month</Label>
                <Select value={fyStartMonth.toString()} onValueChange={(v) => setFyStartMonth(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleArchive}
              disabled={archiveTeam.isPending}
            >
              Archive Team
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

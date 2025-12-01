import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTeamCRUD } from '@/hooks/useTeamCRUD';
import { useAgencies } from '@/hooks/useAgencies';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOfficeId?: string;
}

export const CreateTeamDialog = ({ open, onOpenChange, defaultOfficeId }: CreateTeamDialogProps) => {
  const [name, setName] = useState('');
  const [agencyId, setAgencyId] = useState(defaultOfficeId || '');
  const [bio, setBio] = useState('');
  const [usesFinancialYear, setUsesFinancialYear] = useState(false);
  const [fyStartMonth, setFyStartMonth] = useState(7);
  
  const { createTeam } = useTeamCRUD();
  const { agencies } = useAgencies();

  // Update agencyId when defaultOfficeId changes or dialog opens
  if (defaultOfficeId && agencyId !== defaultOfficeId) {
    setAgencyId(defaultOfficeId);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agencyId) return;

    await createTeam.mutateAsync({
      name,
      agency_id: agencyId,
      bio: bio || undefined,
      uses_financial_year: usesFinancialYear,
      financial_year_start_month: fyStartMonth,
    });

    // Reset form
    setName('');
    setAgencyId('');
    setBio('');
    setUsesFinancialYear(false);
    setFyStartMonth(7);
    onOpenChange(false);
  };

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
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sales Team A"
              required
            />
          </div>

          <div>
            <Label htmlFor="agency">Office</Label>
            <Select 
              value={agencyId} 
              onValueChange={setAgencyId}
              disabled={!!defaultOfficeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an office" />
              </SelectTrigger>
              <SelectContent>
                {agencies?.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {defaultOfficeId && (
              <p className="text-xs text-muted-foreground mt-1">
                Office pre-selected for this team
              </p>
            )}
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

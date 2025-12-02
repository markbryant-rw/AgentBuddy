import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { Target, Phone, ClipboardCheck, Building2, HandshakeIcon } from 'lucide-react';

interface SetTeamGoalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  quarter: number;
}

export const SetTeamGoalsModal = ({ open, onOpenChange, year, quarter }: SetTeamGoalsModalProps) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [calls, setCalls] = useState(1300);
  const [appraisals, setAppraisals] = useState(65);
  const [listings, setListings] = useState(20);
  const [sales, setSales] = useState(15);

  // Fetch existing quarterly goals
  const { data: existingGoals } = useQuery({
    queryKey: ['quarterly-goals', team?.id, year, quarter],
    queryFn: async () => {
      if (!team?.id) return [];
      const { data, error } = await supabase
        .from('quarterly_goals')
        .select('*')
        .eq('team_id', team.id)
        .eq('year', year)
        .eq('quarter', `Q${quarter}`)
        .eq('goal_type', 'team');
      
      if (error) throw error;
      return data;
    },
    enabled: !!team?.id && open,
  });

  useEffect(() => {
    if (existingGoals && existingGoals.length > 0) {
      const callsGoal = existingGoals.find(g => g.kpi_type === 'calls');
      const appraisalsGoal = existingGoals.find(g => g.kpi_type === 'appraisals');
      const listingsGoal = existingGoals.find(g => g.kpi_type === 'listings');
      const salesGoal = existingGoals.find(g => g.kpi_type === 'sales');
      
      if (callsGoal) setCalls(callsGoal.target_value);
      if (appraisalsGoal) setAppraisals(appraisalsGoal.target_value);
      if (listingsGoal) setListings(listingsGoal.target_value);
      if (salesGoal) setSales(salesGoal.target_value);
    }
  }, [existingGoals]);

  const handleSave = async () => {
    if (!team?.id || !user?.id) return;

    setLoading(true);
    try {
      // Delete existing goals for this quarter
      await supabase
        .from('quarterly_goals')
        .delete()
        .eq('team_id', team.id)
        .eq('year', year)
        .eq('quarter', `Q${quarter}`)
        .eq('goal_type', 'team');

      // Insert new goals
      const goalsToInsert = [
        { kpi_type: 'calls', target_value: calls },
        { kpi_type: 'appraisals', target_value: appraisals },
        { kpi_type: 'listings', target_value: listings },
        { kpi_type: 'sales', target_value: sales },
      ].map(goal => ({
        team_id: team.id,
        goal_type: 'team' as const,
        quarter: `Q${quarter}`,
        year,
        kpi_type: goal.kpi_type,
        target_value: goal.target_value,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('quarterly_goals')
        .insert(goalsToInsert);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['quarterly-goals'] });
      await queryClient.invalidateQueries({ queryKey: ['quarterly-metrics'] });

      toast.success('Team goals saved!', {
        description: `Q${quarter} ${year} targets have been set.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Failed to save goals');
    } finally {
      setLoading(false);
    }
  };

  const weeklyTargets = {
    calls: Math.round(calls / 13),
    appraisals: Math.round(appraisals / 13),
    listings: Math.round(listings / 13),
    sales: Math.round(sales / 13),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Set Team Goals for Q{quarter} {year}
          </DialogTitle>
          <DialogDescription>
            Set quarterly targets for your team. These will be divided across 13 weeks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              Calls (Quarterly)
            </Label>
            <Input
              type="number"
              value={calls}
              onChange={(e) => setCalls(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              ~{weeklyTargets.calls} per week
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              Appraisals (Quarterly)
            </Label>
            <Input
              type="number"
              value={appraisals}
              onChange={(e) => setAppraisals(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              ~{weeklyTargets.appraisals} per week
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" />
              Listings (Quarterly)
            </Label>
            <Input
              type="number"
              value={listings}
              onChange={(e) => setListings(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              ~{weeklyTargets.listings} per week
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <HandshakeIcon className="h-4 w-4 text-orange-600" />
              Sales (Quarterly)
            </Label>
            <Input
              type="number"
              value={sales}
              onChange={(e) => setSales(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              ~{weeklyTargets.sales} per week
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Goals'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

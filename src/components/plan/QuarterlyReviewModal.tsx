import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useQuarterlyMetrics } from '@/hooks/useQuarterlyMetrics';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuarterlyReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  quarter: number;
}

export const QuarterlyReviewModal = ({ open, onOpenChange, year, quarter }: QuarterlyReviewModalProps) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { data: metrics, isLoading: metricsLoading } = useQuarterlyMetrics(user?.id || '', year, quarter);
  
  const [loading, setLoading] = useState(false);
  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [learnings, setLearnings] = useState('');
  const [actionItems, setActionItems] = useState('');

  // Fetch quarterly goals
  const { data: quarterlyGoals } = useQuery({
    queryKey: ['quarterly-goals', team?.id, year, quarter],
    queryFn: async () => {
      if (!team?.id) return [];
      const { data, error } = await supabase
        .from('quarterly_goals')
        .select('*')
        .eq('team_id', team.id)
        .eq('year', year)
        .eq('quarter', quarter)
        .eq('goal_type', 'team');
      
      if (error) throw error;
      return data;
    },
    enabled: !!team?.id && open,
  });

  useEffect(() => {
    const loadExistingReview = async () => {
      if (!team?.id || !open) return;

      const { data } = await supabase
        .from('quarterly_reviews')
        .select('*')
        .eq('team_id', team.id)
        .eq('year', year)
        .eq('quarter', quarter)
        .eq('review_type', 'team')
        .maybeSingle();

      if (data) {
        setWins(data.wins || '');
        setChallenges(data.challenges || '');
        setLearnings(data.lessons_learned || '');
        setActionItems(data.action_items || '');
      }
    };

    loadExistingReview();
  }, [team?.id, year, quarter, open, user?.id]);

  const handleSave = async () => {
    if (!team?.id || !user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quarterly_reviews')
        .upsert({
          team_id: team.id,
          user_id: user.id,
          year,
          quarter,
          review_type: 'team',
          wins,
          challenges,
          lessons_learned: learnings,
          action_items: actionItems,
          completed: true,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Review saved!', {
        description: `Q${quarter} ${year} review has been saved.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  const getGoalTarget = (kpiType: string) => {
    return quarterlyGoals?.find(g => g.kpi_type === kpiType)?.target_value || 0;
  };

  const compareMetrics = [
    {
      label: 'Appraisals',
      target: getGoalTarget('appraisals'),
      actual: metrics?.appraisals || 0,
      icon: '📋',
    },
    {
      label: 'Calls',
      target: getGoalTarget('calls'),
      actual: metrics?.calls || 0,
      icon: '📞',
    },
    {
      label: 'Listings',
      target: getGoalTarget('listings'),
      actual: metrics?.listings || 0,
      icon: '🏠',
    },
    {
      label: 'Sales',
      target: getGoalTarget('sales'),
      actual: metrics?.sales || 0,
      icon: '🤝',
    },
  ];

  if (metricsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Q{quarter} {year} Review
          </DialogTitle>
          <DialogDescription>
            Review your team's performance and capture learnings for next quarter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Performance Comparison */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Performance vs Target</h3>
            <div className="grid grid-cols-2 gap-3">
              {compareMetrics.map((metric) => {
                const percentage = metric.target > 0 ? (metric.actual / metric.target) * 100 : 0;
                const achieved = percentage >= 100;

                return (
                  <Card key={metric.label} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {metric.icon} {metric.label}
                      </span>
                      {achieved ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-semibold">{metric.target}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-semibold">{metric.actual}</span>
                      </div>
                      <div className={cn(
                        'text-xs font-semibold text-right',
                        achieved ? 'text-green-600' : 'text-orange-600'
                      )}>
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Reflection Questions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What went well? 🎉</Label>
              <Textarea
                placeholder="Celebrate wins, successful strategies, and positive momentum..."
                value={wins}
                onChange={(e) => setWins(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>What didn't go well? 🤔</Label>
              <Textarea
                placeholder="Challenges faced, missed targets, and obstacles..."
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Key learnings 💡</Label>
              <Textarea
                placeholder="Insights gained, patterns noticed, and lessons learned..."
                value={learnings}
                onChange={(e) => setLearnings(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Action items for next quarter 🎯</Label>
              <Textarea
                placeholder="Specific actions to take, strategies to implement, and goals to focus on..."
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

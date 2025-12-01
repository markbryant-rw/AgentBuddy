import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useWeeklyCCH } from '@/hooks/useWeeklyCCH';
import { useQuarterlyMetrics } from '@/hooks/useQuarterlyMetrics';

interface AppraisalsMetricCardProps {
  userId: string;
}

export const AppraisalsMetricCard = ({ userId }: AppraisalsMetricCardProps) => {
  const [view, setView] = useState<'weekly' | 'quarterly'>('weekly');
  const { data: weeklyData } = useWeeklyCCH(userId);
  const { data: quarterlyData } = useQuarterlyMetrics(userId);

  const currentAppraisals = view === 'weekly' 
    ? weeklyData?.appraisals || 0 
    : quarterlyData?.appraisals || 0;
  
  const targetAppraisals = view === 'weekly' ? 5 : 65; // 5/week * 13 weeks
  const progress = (currentAppraisals / targetAppraisals) * 100;
  const isAhead = currentAppraisals >= targetAppraisals;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Metric That Matters</p>
            <h3 className="text-lg font-bold mt-1">Appraisals</h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant={view === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('weekly')}
            >
              Week
            </Button>
            <Button
              variant={view === 'quarterly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('quarterly')}
            >
              Quarter
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold">{currentAppraisals}</span>
          <span className="text-2xl text-muted-foreground pb-1">/ {targetAppraisals}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isAhead ? 'bg-green-500' : progress > 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {isAhead ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500 font-medium">On target! Keep it up!</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500 font-medium">
                {targetAppraisals - currentAppraisals} more needed
              </span>
            </>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>Target: {view === 'weekly' ? '5 per week' : '65 per quarter'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

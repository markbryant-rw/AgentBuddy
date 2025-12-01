import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import { QuarterlyGoal } from '@/hooks/useQuarterlyGoals';

interface QuarterlyGoalCardProps {
  goal: QuarterlyGoal;
  actualValue?: number;
}

export const QuarterlyGoalCard = ({ goal, actualValue = 0 }: QuarterlyGoalCardProps) => {
  const progress = (actualValue / goal.target_value) * 100;
  const isOnTrack = progress >= 75;

  const formatKpiType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{formatKpiType(goal.kpi_type)}</CardTitle>
          </div>
          <Badge variant={goal.goal_type === 'team' ? 'secondary' : 'outline'}>
            {goal.goal_type === 'team' ? 'Team Goal' : 'Personal Goal'}
          </Badge>
        </div>
        <CardDescription>Target: {goal.target_value}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Progress</span>
            <span className="font-medium">{actualValue} / {goal.target_value}</span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className={isOnTrack ? 'text-green-600' : 'text-amber-600'}>
              {progress.toFixed(0)}% Complete
            </span>
            {isOnTrack && (
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                On Track
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

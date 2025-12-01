import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Target, TrendingUp } from 'lucide-react';
import { getQuarter, getWeek, startOfQuarter, differenceInWeeks } from 'date-fns';

export const CurrentWidget = () => {
  const navigate = useNavigate();
  const currentQuarter = getQuarter(new Date());
  const year = new Date().getFullYear();
  const quarterStart = startOfQuarter(new Date());
  const weeksIntoQuarter = differenceInWeeks(new Date(), quarterStart) + 1;
  const totalWeeksInQuarter = 13;

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group border-primary/20"
      onClick={() => navigate('/plan/current')}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">This Quarter</h3>
              <p className="text-sm text-muted-foreground">Q{currentQuarter} {year}</p>
            </div>
          </div>
          <Badge variant="default" className="bg-primary">
            Current Plan
          </Badge>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Week {weeksIntoQuarter} of {totalWeeksInQuarter}</span>
            <span className="text-sm font-medium">{Math.round((weeksIntoQuarter / totalWeeksInQuarter) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(weeksIntoQuarter / totalWeeksInQuarter) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Appraisals Progress</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-semibold">On Track</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">CCH This Week</span>
            <span className="font-semibold">View Details</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium text-primary">View Detailed Progress</span>
          <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

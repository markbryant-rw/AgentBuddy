import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Compass, Calendar } from 'lucide-react';
import { getQuarter, addQuarters } from 'date-fns';

export const RoadmapWidget = () => {
  const navigate = useNavigate();
  const nextQuarter = addQuarters(new Date(), 1);
  const quarterNum = getQuarter(nextQuarter);
  const year = nextQuarter.getFullYear();

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
      onClick={() => navigate('/plan/roadmap')}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/30">
              <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Next Quarter Planning</h3>
              <p className="text-sm text-muted-foreground">Q{quarterNum} {year}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Draft
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Projected Targets</span>
            <span className="font-semibold">Set Goals</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Key Objectives</span>
            <span className="font-semibold">Plan Strategy</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Milestones</span>
            <span className="font-semibold">Schedule</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium text-primary">Start Planning</span>
          <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

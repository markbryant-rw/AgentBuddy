import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, CheckCircle2, Calendar } from 'lucide-react';
import { getQuarter, subQuarters, format } from 'date-fns';

export const ReviewWidget = () => {
  const navigate = useNavigate();
  const lastQuarter = subQuarters(new Date(), 1);
  const quarterNum = getQuarter(lastQuarter);
  const year = lastQuarter.getFullYear();

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
      onClick={() => navigate('/plan/review')}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/30">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Last Quarter Review</h3>
              <p className="text-sm text-muted-foreground">Q{quarterNum} {year}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Appraisals Completed</span>
            <span className="font-semibold">View Report</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">CCH Achieved</span>
            <span className="font-semibold">View Report</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Target Achievement</span>
            <span className="font-semibold">View Report</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium text-primary">View Full Review</span>
          <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

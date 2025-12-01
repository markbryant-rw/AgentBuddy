import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, TrendingUp, Target } from 'lucide-react';

export const ReviewRoadmapWidget = () => {
  const navigate = useNavigate();

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
      onClick={() => navigate('/review-roadmap')}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/30">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Review & Roadmap</h3>
              <p className="text-sm text-muted-foreground">Progress & Goals</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Target className="h-3 w-3 mr-1" />
            Planning
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Goals Set</span>
            <span className="font-semibold">—</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Skills Tracked</span>
            <span className="font-semibold">—</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Reviews</span>
            <span className="font-semibold">—</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium text-primary">Track Your Progress</span>
          <ChevronRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

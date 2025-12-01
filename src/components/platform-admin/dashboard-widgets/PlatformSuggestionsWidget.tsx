import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useFeatureRequestStats } from '@/hooks/useFeatureRequestStats';
import { Skeleton } from '@/components/ui/skeleton';

export const PlatformSuggestionsWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useFeatureRequestStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Platform Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500"
      onClick={() => navigate('/platform-admin/feedback?tab=features')}
    >
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Platform Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </div>
          <TrendingUp className="h-10 w-10 text-yellow-600" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
              {stats?.pending || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {stats?.underConsideration || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Reviewing</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {stats?.inProgress || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Building</p>
          </div>
        </div>

        {stats?.topVoted && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Most Voted</p>
            <p className="text-sm font-medium truncate">{stats.topVoted.title}</p>
            <p className="text-xs text-muted-foreground">{stats.topVoted.votes} votes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

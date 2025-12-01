import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useBugReportStats } from '@/hooks/useBugReportStats';
import { Skeleton } from '@/components/ui/skeleton';

export const BugHuntWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useBugReportStats();

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="h-5 w-5 text-red-600" />
            Bug Hunt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500"
      onClick={() => navigate('/platform-admin/feedback?tab=bugs')}
    >
      <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bug className="h-5 w-5 text-red-600" />
          Bug Hunt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </div>
          <Bug className="h-10 w-10 text-red-600" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <Badge variant="destructive">
              {stats?.critical || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Critical</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              {stats?.pending || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {stats?.fixedThisMonth || 0}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Fixed</p>
          </div>
        </div>

        {stats?.topHunters && stats.topHunters.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-yellow-600" />
              <p className="text-xs font-medium">Top Bug Hunters</p>
            </div>
            <div className="space-y-2">
              {stats.topHunters.map((hunter, idx) => (
                <div key={hunter.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={hunter.avatar_url || ''} />
                    <AvatarFallback>{hunter.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{hunter.full_name}</span>
                  <Badge variant="outline" className="text-xs">{hunter.total_bug_points || 0}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

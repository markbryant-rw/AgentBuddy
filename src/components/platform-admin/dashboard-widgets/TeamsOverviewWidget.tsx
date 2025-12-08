import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users2, Users } from 'lucide-react';
import { usePlatformStats } from '@/hooks/usePlatformStats';
import { WidgetSkeleton } from '@/components/ui/workspace-skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const TeamsOverviewWidget = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePlatformStats();

  if (isLoading) {
    return <WidgetSkeleton workspace="platform-admin" />;
  }

  const totalTeams = stats?.totalTeams || 0;
  const totalUsers = stats?.totalUsers || 0;
  const avgTeamSize = totalTeams > 0 ? Math.round(totalUsers / totalTeams) : 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500"
      onClick={() => navigate('/platform-admin/teams')}
    >
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users2 className="h-5 w-5 text-indigo-600" />
          Teams
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totalTeams}</div>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </div>
          <Users2 className="h-10 w-10 text-indigo-600 opacity-20" />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-muted-foreground">Avg. Team Size</span>
          </div>
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {avgTeamSize} members
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

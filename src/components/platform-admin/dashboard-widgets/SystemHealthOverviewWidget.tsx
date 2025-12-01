import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useUsersWithoutRoles } from '@/hooks/useUsersWithoutRoles';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const SystemHealthOverviewWidget = () => {
  const navigate = useNavigate();
  const { data: health, isLoading } = useSystemHealth();
  const { data: usersWithoutRoles = [] } = useUsersWithoutRoles();
  
  const totalIssues = (health?.criticalIssues || 0) + (health?.warnings || 0) + usersWithoutRoles.length;

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return CheckCircle2;
    if (score >= 70) return AlertTriangle;
    return AlertCircle;
  };

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-red-600" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const healthScore = health?.healthScore || 0;
  const HealthIcon = getHealthIcon(healthScore);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500"
      onClick={() => navigate('/platform-admin/health')}
    >
      <CardHeader className="bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-red-600" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}%
            </div>
            <p className="text-sm text-muted-foreground">Overall Health</p>
          </div>
          <HealthIcon className={`h-10 w-10 ${getHealthColor(healthScore)}`} />
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-muted-foreground">Total Issues</span>
          </div>
          <Badge variant={totalIssues > 0 ? "destructive" : "secondary"} className={totalIssues === 0 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}>
            {totalIssues}
          </Badge>
        </div>
        
        {totalIssues > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/platform-admin/health');
            }}
          >
            View & Fix Issues
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

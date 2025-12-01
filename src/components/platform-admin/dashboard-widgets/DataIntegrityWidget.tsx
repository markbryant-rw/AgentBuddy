import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useDataHealth } from '@/hooks/useDataHealth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const DataIntegrityWidget = () => {
  const navigate = useNavigate();
  const { data: issues, isLoading } = useDataHealth(null); // null = global view for platform admin

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-background pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-orange-600" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const issueCount = issues?.length || 0;
  const healthScore = issueCount === 0 ? 100 : Math.max(0, 100 - (issueCount * 5));

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500"
      onClick={() => navigate('/platform-admin/health')}
    >
      <CardHeader className="bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/20 dark:to-background pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-5 w-5 text-orange-600" />
          Data Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-3xl font-bold ${issueCount === 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {healthScore}%
            </div>
            <p className="text-sm text-muted-foreground">Data Health Score</p>
          </div>
          {issueCount === 0 ? (
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          ) : (
            <AlertTriangle className="h-10 w-10 text-orange-600" />
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-muted-foreground">Data Issues</span>
          </div>
          <Badge variant={issueCount > 0 ? "destructive" : "secondary"} className={issueCount === 0 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}>
            {issueCount}
          </Badge>
        </div>
        
        {issueCount > 0 && (
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
